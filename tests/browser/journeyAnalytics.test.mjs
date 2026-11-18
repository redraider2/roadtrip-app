import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer as netServer } from "node:net";
import { userInfo } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(new URL("../../backend/package.json", import.meta.url));
const { Pool } = require("pg");
const pgBin = process.env.PG_BIN || execFileSync("pg_config", ["--bindir"], { encoding: "utf8" }).trim();
const freePort = () => new Promise((resolve, reject) => {
  const s = netServer(); s.on("error", reject); s.listen(0, "127.0.0.1", () => { const port = s.address().port; s.close(() => resolve(port)); });
});
const temp = await mkdtemp("/tmp/kickoff-analytics-");
const dbPort = await freePort(), apiPort = await freePort(), appPort = await freePort();
const api = `http://127.0.0.1:${apiPort}`, app = `http://127.0.0.1:${appPort}`;
let backend, vite, browser, pool, postgresStarted = false;
let backendLog = "";
const outputs = path.join(root, "outputs/analytics-verification");
const routeData = { geometry: [[41.88, -87.63], [35.15, -89.97], [33.21, -87.55]], distanceMeters: 1155509, durationSeconds: 38580 };
const events = (page) => page.evaluate(() => window.__journeyEvents);
const count = async (page, event) => (await events(page)).filter((e) => e.event === event).length;
try {
  await mkdir(outputs, { recursive: true });
  execFileSync(path.join(pgBin, "initdb"), ["-D", `${temp}/db`, "-A", "trust", "--no-locale", "-E", "UTF8"], { stdio: "pipe" });
  execFileSync(path.join(pgBin, "pg_ctl"), ["-D", `${temp}/db`, "-l", `${temp}/postgres.log`, "-o", `-h 127.0.0.1 -p ${dbPort} -k ${temp}`, "-w", "start"], { stdio: "pipe" });
  postgresStarted = true;
  const databaseURL = `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:${dbPort}/postgres`;
  pool = new Pool({ connectionString: databaseURL });
  const schema = (await readFile(path.join(root, "roadtrip_schema.sql"), "utf8")).replace(/^\\set.*$/m, "");
  await pool.query(schema);
  await pool.query("ALTER TABLE stops ADD COLUMN is_route_stop BOOLEAN NOT NULL DEFAULT TRUE");
  backend = spawn(process.execPath, ["src/server.js"], { cwd: path.join(root, "backend"), env: {
    ...process.env, PORT: String(apiPort), DATABASE_URL: databaseURL, PGSSLMODE: "", JWT_SECRET: "isolated-local-analytics-test-only",
    NODE_ENV: "development", CORS_ORIGIN: app, GOOGLE_MAPS_API_KEY: "", CFBD_API_KEY: "",
  }, stdio: ["ignore", "pipe", "pipe"] });
  backend.stdout.on("data", (v) => { backendLog += v; }); backend.stderr.on("data", (v) => { backendLog += v; });
  await expect.poll(async () => { try { return (await fetch(api)).ok; } catch { return false; } }, { timeout: 15000 }).toBe(true);
  // The real server handles registration, sign-in, trip INSERT/SELECT and stop loading.
  // Only third-party football/maps/recommendations are deterministic fixtures.
  const registered = await fetch(`${api}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "analytics_local_test", email: "analytics@example.test", password: "LocalTestOnly-12345" }) });
  assert.equal(registered.status, 201);
  vite = await createServer({ root, server: { host: "127.0.0.1", port: appPort, strictPort: true }, cacheDir: `${temp}/vite-cache`,
    define: { "import.meta.env.VITE_API_URL": JSON.stringify(api) },
    // Exercise the installed SDK, not a mock. Its documented beforeSend hook
    // records custom events and drops ALL test telemetry before delivery.
    plugins: [{ name: "isolated-analytics-sink", enforce: "pre", transform(code, id) {
      if (id !== path.join(root, "src/main.jsx")) return;
      return code.replace("analytics.init({", `window.__journeyEvents = [];
analytics.init({
  beforeSend(event) {
    if (event && ["team_selected", "away_game_selected", "route_created", "trip_saved"].includes(event.event)) {
      window.__journeyEvents.push({ event: event.event, properties: event.properties });
    }
    return null;
  },`);
    } }],
  });
  await vite.listen();
  browser = await chromium.launch();
  async function open({ authenticated = false } = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36" });
    // HeyCatch filters automation (navigator.webdriver). Model a normal browser
    // only in this isolated test; beforeSend still drops every outbound event.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
    });
    page.on("console", (message) => { if (/HeyCatch|PostHog|posthog/i.test(message.text())) console.log("SDK:", message.text().slice(0,500)); });
    page.on("pageerror", (error) => console.log("Browser error:", error.message));
    const controls = { failSave: false, expireSave: false, failRoute: false, holdSave: null, posts: 0 };
    await page.route("**/*", async (request) => {
      const url = new URL(request.request().url());
      if (url.origin === app) return request.continue();
      if (url.origin !== api) return request.abort();
      const p = url.pathname;
      if (p === "/trips" && request.request().method() === "POST") {
        controls.posts++;
        if (controls.holdSave) await controls.holdSave;
        if (controls.expireSave) return request.fulfill({ status: 401, json: { error: "Expired test session" } });
        if (controls.failSave) return request.fulfill({ status: 503, json: { error: "Test persistence failure" } });
        return request.continue();
      }
      if (p.startsWith("/trips") || p.startsWith("/auth")) return request.continue();
      let json = [];
      if (p === "/football/teams") json = [{ id: 2, school: "Auburn", logos: [], color: "#e87722" }, { id: 3, school: "Alabama", logos: [] }];
      if (p === "/football/games") json = [{ id: 101, awayTeam: "Auburn", homeTeam: "Alabama", venueId: 3657, venue: "Bryant-Denny Stadium", startDate: "2099-11-27T18:00:00Z" }];
      if (p === "/football/venues/3657") json = { id: 3657, name: "Bryant-Denny Stadium", city: "Tuscaloosa", state: "AL", latitude: 33.21, longitude: -87.55 };
      if (p === "/geocode") json = url.searchParams.get("q").includes("Test Avenue") ? { latitude: 41.88, longitude: -87.63 } : { latitude: 33.21, longitude: -87.55 };
      if (p === "/route") return request.fulfill({ status: controls.failRoute ? 503 : 200, json: controls.failRoute ? { error: "Test routing failure" } : routeData });
      if (p.endsWith("/places") || p === "/football/along-the-way") json = { places: [] };
      if (p.endsWith("/featured-partner")) json = null;
      if (p.endsWith("/game-day-guide")) json = { venueName: "Bryant-Denny Stadium", homeTeam: "Alabama" };
      return request.fulfill({ json });
    });
    await page.goto(app);
    if (authenticated) {
      await page.locator(".home-account-access > summary").click();
      await page.getByPlaceholder("Email", { exact: true }).fill("analytics@example.test");
      await page.getByPlaceholder("Password", { exact: true }).fill("LocalTestOnly-12345");
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      await expect(page.getByRole("button", { name: "Sign Out", exact: true })).toBeVisible();
    }
    async function choose() {
      await page.getByRole("button", { name: "Choose Your Team", exact: true }).click();
      await page.locator(".team-choice").filter({ hasText: "Auburn" }).click();
      await expect.poll(() => count(page, "team_selected")).toBe(1);
      await page.locator(".game-destination").click();
      await page.locator(".game-destination").click(); // Repeated selection must not double count.
      await expect.poll(() => count(page, "away_game_selected")).toBe(1);
      await page.getByPlaceholder("e.g., Houston, TX").fill("123 Test Avenue, Chicago, IL");
    }
    return { page, controls, choose };
  }

  console.log("SDK hook installed:", (await (await fetch(`${app}/src/main.jsx`)).text()).includes("beforeSend(event)"));
  const saved = await open({ authenticated: true });
  await saved.choose();
  let releaseSave;
  saved.controls.holdSave = new Promise((resolve) => { releaseSave = resolve; });
  await saved.page.locator(".planner-form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
  await expect.poll(() => saved.controls.posts).toBe(1);
  assert.equal(await count(saved.page, "trip_saved"), 0, "No success event before persistence response");
  assert.equal(await count(saved.page, "route_created"), 0);
  releaseSave();
  await expect(saved.page.locator("#trip-hq-title")).toHaveText("Auburn @ Alabama");
  await expect.poll(() => count(saved.page, "route_created")).toBe(1);
  assert.deepEqual((await events(saved.page)).map((e) => e.event), ["team_selected", "away_game_selected", "trip_saved", "route_created"]);
  const row = (await pool.query("SELECT * FROM trips")).rows;
  assert.equal(row.length, 1); assert.equal(row[0].start_location, "123 Test Avenue, Chicago, IL"); assert.equal(Number(row[0].venue_id), 3657);
  const captured = await events(saved.page);
  assert.ok(captured.every((e) => e.properties.heycatch_custom_user_event === true), "Real SDK marks each business outcome as a custom event");
  const payload = JSON.stringify(captured);
  for (const privateValue of ["Test Avenue", "analytics@example.test", "LocalTestOnly", "latitude", "longitude", "start_location"]) assert.ok(!payload.includes(privateValue), privateValue);
  await saved.page.screenshot({ path: path.join(outputs, "saved-trip.png"), fullPage: true });
  console.log("PASS: all four events occur once at successful outcomes; real PostgreSQL INSERT; rapid duplicate submit blocked; no private properties");

  await saved.page.goto(`${app}/#/home`);
  await saved.page.reload();
  await saved.page.locator(".home-account-access > summary").click();
  await saved.page.locator(".trip-row").filter({ hasText: "Auburn @ Alabama" }).click();
  await expect(saved.page.locator("#trip-hq-title")).toHaveText("Auburn @ Alabama");
  await expect(saved.page.locator(".trip-hq-stats")).toContainText("718 miles");
  await expect(saved.page.locator(".trip-hq-journey")).toContainText("123 Test Avenue, Chicago, IL");
  assert.deepEqual(await events(saved.page), [], "Restoring persisted state must not report new selection/save/route outcomes");
  await saved.page.screenshot({ path: path.join(outputs, "reopened-after-refresh.png"), fullPage: true });
  console.log("PASS: actual saved trip reloaded from backend after refresh and reopened with route, destination, and start intact; zero duplicate outcome events");
  await saved.page.close();

  const guest = await open(); await guest.choose();
  await guest.page.getByRole("button", { name: /Plan My Road Trip/ }).click();
  await expect.poll(() => count(guest.page, "route_created")).toBe(1);
  assert.deepEqual((await events(guest.page)).map((e) => e.event), ["team_selected", "away_game_selected", "route_created"]);
  assert.equal(guest.controls.posts, 0);
  console.log("PASS: guest preview produces selection/route events and never trip_saved or a persistence request");
  await guest.page.close();

  const failed = await open({ authenticated: true }); await failed.choose(); failed.controls.failSave = true;
  await failed.page.getByRole("button", { name: /Plan My Road Trip/ }).click();
  await expect(failed.page.getByText("The football road trip could not be created.", { exact: false })).toBeVisible();
  assert.equal(await count(failed.page, "trip_saved"), 0); assert.equal(await count(failed.page, "route_created"), 0);
  assert.equal(Number((await pool.query("SELECT count(*) FROM trips")).rows[0].count), 1);
  console.log("PASS: failed persistence emits no trip_saved/route_created and does not add a database row");
  await failed.page.close();

  const routeFailure = await open({ authenticated: true }); await routeFailure.choose(); routeFailure.controls.failRoute = true;
  await routeFailure.page.getByRole("button", { name: /Plan My Road Trip/ }).click();
  await expect(routeFailure.page.locator(".trip-hq-stats")).toContainText("Road route unavailable");
  assert.equal(await count(routeFailure.page, "trip_saved"), 1); assert.equal(await count(routeFailure.page, "route_created"), 0);
  console.log("PASS: successful persistence followed by failed routing emits trip_saved but no route_created");
  await routeFailure.page.close();

  const expired = await open({ authenticated: true }); await expired.choose(); expired.controls.expireSave = true;
  await expired.page.getByRole("button", { name: /Plan My Road Trip/ }).click();
  await expect.poll(() => count(expired.page, "route_created")).toBe(1);
  assert.equal(await count(expired.page, "trip_saved"), 0);
  assert.equal((await events(expired.page)).find((e) => e.event === "route_created").properties.planning_mode, "preview");
  console.log("PASS: expired session falls back to preview and never emits trip_saved");
  await expired.page.close();
} catch (error) {
  console.error("Local backend log:", backendLog.slice(-3000));
  throw error;
} finally {
  await browser?.close(); await vite?.close();
  if (backend) { backend.kill("SIGTERM"); await new Promise((resolve) => backend.once("exit", resolve)); }
  await pool?.end();
  if (postgresStarted) execFileSync(path.join(pgBin, "pg_ctl"), ["-D", `${temp}/db`, "-m", "fast", "-w", "stop"], { stdio: "pipe" });
  await rm(temp, { recursive: true, force: true });
}
