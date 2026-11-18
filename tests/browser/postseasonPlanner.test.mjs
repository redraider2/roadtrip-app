import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseURL = process.env.JOURNEY_BASE_URL || "http://127.0.0.1:5173";
const output = new URL("../../outputs/postseason-review/", import.meta.url);
await mkdir(output, { recursive: true });
const games = [
  { id: "away", awayTeam: "Texas", homeTeam: "TCU", venueId: 3, venue: "TCU Stadium", startDate: "2026-11-28T18:00:00Z" },
  { id: "neutral", homeTeam: "Texas", awayTeam: "Oklahoma", neutralSite: true, venueId: 499, venue: "Cotton Bowl", startDate: "2026-12-01T18:00:00Z" },
  { id: "bowl", homeTeam: "Oregon", awayTeam: "Texas", neutralSite: true, seasonType: "postseason", venueId: 990001, venue: "Bowl Test Stadium", eventName: "Example Bowl", startDate: "2026-12-27T18:00:00Z" },
  { id: "cfp", homeTeam: "Texas", awayTeam: "Georgia", neutralSite: true, seasonType: "postseason", venueId: 990001, venue: "Bowl Test Stadium", eventName: "Peach Bowl", playoff: { competition: "cfp", round: "quarterfinal" }, startDate: "2027-01-01T18:00:00Z" },
  { id: "campus", homeTeam: "Texas", awayTeam: "Clemson", seasonType: "postseason", venueId: 1, venue: "Texas Stadium", eventName: "College Football Playoff First Round", playoff: { competition: "cfp", round: "first_round" }, startDate: "2026-12-20T18:00:00Z" },
  { id: "tbd", homeTeam: "Texas", awayTeam: "TCU", neutralSite: true, seasonType: "postseason", eventName: "Unannounced Venue Bowl", startTimeTBD: true, startDate: "2026-12-30T18:00:00Z" },
];
const teams = ["Texas", "TCU", "Georgia", "Oregon", "Clemson", "Oklahoma"].map(school => ({ school, logos: [], color: "#a34512" }));
const venue = { id: 990001, name: "Bowl Test Stadium", city: "New City", state: "FL", latitude: 28.5, longitude: -81.4 };
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    const requests = [];
    let savedTrip;
    let availableGames = games;
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-11-18T18:00:00Z"));
    // Exercise guest planning on desktop and authenticated trip saving on mobile.
    if (width === 390) await page.addInitScript(() => localStorage.setItem("roadtrip_auth", JSON.stringify({ token: "fixture", user: { email: "preview@example.com" } })));
    await page.route("http://localhost:5001/**", async route => {
      const request = route.request();
      const url = new URL(request.url());
      requests.push(url);
      let data = [];
      if (url.pathname === "/football/teams") data = teams;
      else if (url.pathname === "/football/games") {
        assert.equal(url.searchParams.get("includePostseason"), "true");
        assert.equal(url.searchParams.get("roadOnly"), "true");
        if (availableGames === null) return route.fulfill({ status: 502, json: { error: "Provider unavailable" } });
        data = availableGames;
      } else if (url.pathname === "/trips" && request.method() === "POST") {
        savedTrip = request.postDataJSON();
        data = { id: 41, ...savedTrip };
      } else if (url.pathname === "/trips") data = savedTrip ? [{ id: 41, ...savedTrip }] : [];
      else if (url.pathname.endsWith("/game-day-guide")) return route.fulfill({ status: 404, json: { error: "No guide" } });
      else if (url.pathname.endsWith("/places")) data = { venue, places: [] };
      else if (/\/football\/venues\/\d+$/.test(url.pathname)) data = venue;
      else if (url.pathname === "/route") data = { distanceMeters: 1500000, durationSeconds: 40000, geometry: [[30.2, -97.7], [28.5, -81.4]] };
      else if (url.pathname === "/geocode") data = { latitude: 28.5, longitude: -81.4 };
      else if (url.pathname === "/football/along-the-way") data = { places: [] };
      else if (url.pathname.endsWith("/featured-partner")) data = null;
      return route.fulfill({ json: data });
    });
    await page.route("**/in.heycatch.ai/**", route => route.abort());
    await page.route("**/_vercel/insights/**", route => route.fulfill({ body: "" }));
    await page.goto(`${baseURL}/#/choose-team`, { waitUntil: "domcontentloaded" });
    await page.locator(".team-choice").filter({ hasText: "Texas" }).click();
    const cfp = page.getByRole("region", { name: "College Football Playoff", exact: true });
    const other = page.getByRole("region", { name: "Bowl & Road Games", exact: true });
    await cfp.getByText("Quarterfinal", { exact: true }).waitFor();
    assert.equal(await cfp.locator(".game-destination").count(), 2);
    assert.equal(await other.locator(".game-destination").count(), 4);
    assert.equal(await other.getByRole("button", { name: /Unannounced Venue Bowl/ }).isDisabled(), true);
    assert.match(await other.getByRole("button", { name: /Cotton Bowl/ }).innerText(), /Texas[\s\S]+VS[\s\S]+Oklahoma/);
    assert.equal(await cfp.getByText("Example Bowl").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: new URL(`picker-${width}.png`, output).pathname, fullPage: true });
    await cfp.getByRole("button", { name: /Peach Bowl/ }).click();
    assert.equal(await page.locator(".game-trip-setup h2").innerText(), "Texas vs Georgia");
    await page.getByPlaceholder("e.g., Houston, TX").fill("Austin, TX");
    await page.getByRole("button", { name: /Plan My Road Trip/ }).click();
    await page.waitForURL(/trip-hq/);
    await page.locator(".trip-hq-experience").waitFor();
    assert.ok(requests.some(url => url.pathname === "/football/venues/990001"));
    assert.ok(requests.some(url => url.pathname === "/football/venues/990001/places"));
    assert.ok(!requests.some(url => /\/football\/venues\/(3784|3648)\//.test(url.pathname)));
    if (width === 390) {
      assert.equal(savedTrip.venue_id, 990001);
      assert.equal(savedTrip.end_location, "Bowl Test Stadium, New City, FL");
      assert.equal(savedTrip.title, "Texas vs Georgia");
      assert.match(savedTrip.notes, /Peach Bowl/);
    }
    await page.evaluate(() => { location.hash = "/game-weekend"; });
    await page.getByRole("heading", { name: "Game Weekend", exact: true }).waitFor();
    assert.match(await page.locator(".trip-details-panel").innerText(), /Texas vs Georgia/);
    assert.equal(await page.locator(".route-stadium-feature").count(), 0);
    await page.evaluate(() => { location.hash = "/game-day"; });
    await page.getByRole("heading", { name: "Your Game Day Guide" }).waitFor();
    assert.equal(await page.getByRole("heading", { name: "Texas Traditions" }).count(), 0);
    availableGames = [];
    await page.evaluate(() => { location.hash = "/choose-team"; });
    await page.locator(".team-choice").filter({ hasText: "TCU" }).click();
    await page.getByText("No upcoming College Football Playoff matchups are announced for TCU yet.", { exact: true }).waitFor();
    assert.equal(await page.locator(".game-destination").count(), 0);
    availableGames = null;
    await page.getByRole("button", { name: "Choose another team", exact: true }).first().click();
    await page.locator(".team-choice").filter({ hasText: "Texas" }).click();
    await page.getByText("Games could not be loaded for that team. Please try again.", { exact: true }).waitFor();
    assert.equal(await page.locator(".choose-game-playoff").count(), 0);
    assert.deepEqual(errors, []);
    console.log(`Passed CFP grouping, neutral matchups, new-city venue routing, ${width === 390 ? "saved" : "guest"} trip, and mobile layout at ${width}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
