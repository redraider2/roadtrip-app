import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { bowlDestinations } from "../../src/lib/bowlDestinations.js";

const baseURL = process.env.JOURNEY_BASE_URL || "http://127.0.0.1:4174";
const output = new URL("../../outputs/bowl-guides-review/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    const guideRequests = [];
    let campusFirstRound = false;
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-11-18T18:00:00Z"));
    await page.route("**/in.heycatch.ai/**", route => route.abort());
    await page.route("**/_vercel/insights/**", route => route.fulfill({ body: "" }));
    await page.route("http://localhost:5001/**", route => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname === "/football/teams") data = ["Texas", "Georgia Tech", "TCU"].map((school, id) => ({ id: id + 1, school, color: "#a34512", logos: [] }));
      else if (url.pathname === "/football/games") data = [{ id: "fixture", awayTeam: "Texas", homeTeam: campusFirstRound ? "TCU" : "Georgia Tech", neutralSite: !campusFirstRound, seasonType: "postseason", venueId: campusFirstRound ? 3616 : 5348, venue: campusFirstRound ? "Amon G. Carter Stadium" : "Mercedes-Benz Stadium", eventName: campusFirstRound ? "College Football Playoff First Round Game" : "Peach Bowl", playoff: { competition: "cfp", round: campusFirstRound ? "first_round" : "quarterfinal" }, startDate: "2027-01-01T18:00:00Z" }];
      else if (url.pathname.endsWith("/game-day-guide")) { guideRequests.push(url.pathname); data = { venueName: "Mercedes-Benz Stadium", school: "Campus", traditions: { details: ["Campus-only rules"] } }; }
      else if (/\/football\/venues\/\d+$/.test(url.pathname)) data = campusFirstRound ? { id: 3616, name: "Amon G. Carter Stadium", city: "Fort Worth", state: "TX", latitude: 32.7, longitude: -97.36 } : { id: 5348, name: "Mercedes-Benz Stadium", city: "Atlanta", state: "GA", latitude: 33.755, longitude: -84.401 };
      else if (url.pathname.endsWith("/places")) data = { venue: { name: "Mercedes-Benz Stadium", city: "Atlanta", state: "GA", latitude: 33.755, longitude: -84.401 }, places: [] };
      else if (url.pathname === "/route") data = { distanceMeters: 1000000, durationSeconds: 30000, geometry: [[30, -97], [33.755, -84.401]] };
      else if (url.pathname === "/geocode") data = { latitude: 33.755, longitude: -84.401 };
      else if (url.pathname === "/football/along-the-way") data = { places: [] };
      else if (url.pathname.endsWith("/featured-partner")) data = null;
      return route.fulfill({ json: data });
    });
    await page.goto(`${baseURL}/#/destinations`);
    await page.getByText("136 of 136 destinations", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Bowls & CFP", exact: true }).click();
    await page.getByText("37 of 37 destinations", { exact: true }).waitFor();
    const search = page.getByRole("searchbox");
    await search.fill("CFP");
    await page.getByText("7 of 37 destinations", { exact: true }).waitFor();
    await search.fill("");
    const toCheck = width === 1440 ? bowlDestinations : bowlDestinations.filter(d => ["BOWL-LAS-VEGAS", "BOWL-SAN-JUAN", "BOWL-ORLANDO-UCF", "BOWL-ORLANDO-DOWNTOWN"].includes(d.destinationId));
    for (const destination of toCheck) {
      await page.locator(`a[href="#/destinations?market=${destination.destinationId}"]`).click();
      await page.locator(`[data-bowl-destination="${destination.destinationId}"]`).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${destination.destinationId} overflows at ${width}`);
      assert.ok(await page.locator(".bowl-guide-picks article").count() >= 4);
      if (destination.destinationId === "BOWL-LAS-VEGAS") await page.screenshot({ path: new URL(`las-vegas-${width}.png`, output).pathname, fullPage: true });
    }
    await page.reload();
    await page.getByRole("button", { name: "Bowls & CFP", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Bowls & CFP", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "College towns", exact: true }).click();
    await page.getByText("136 of 136 destinations", { exact: true }).waitFor();
    await page.goto(`${baseURL}/#/choose-team`);
    await page.locator(".team-choice").filter({ hasText: "Texas" }).click();
    await page.getByRole("link", { name: "Explore bowl & CFP host-city guides" }).waitFor();
    await page.getByRole("button", { name: /Peach Bowl/ }).click();
    await page.getByPlaceholder("e.g., Houston, TX").fill("Austin, TX");
    await page.getByRole("button", { name: /Plan My Road Trip/ }).click();
    await page.waitForURL(/trip-hq/);
    await page.locator('[data-bowl-destination="BOWL-ATLANTA"]').waitFor();
    await page.evaluate(() => { location.hash = "/game-weekend"; });
    await page.locator(".bowl-guide-picks").waitFor();
    await page.evaluate(() => { location.hash = "/game-day"; });
    await page.locator(".bowl-guide-arrival").waitFor();
    assert.equal(await page.locator(".game-day-guide-grid").count(), 0);
    assert.equal(guideRequests.length, 0, "Postseason trip fetched campus-only policy data");
    assert.equal(await page.getByText("Campus-only rules", { exact: true }).count(), 0);
    assert.ok(await page.locator('a[href="https://www.mercedesbenzstadium.com/visit/a-to-z-guide"]').count());
    campusFirstRound = true;
    await page.goto(`${baseURL}/#/choose-team`);
    await page.locator(".team-choice").filter({ hasText: "TCU" }).click();
    await page.getByRole("button", { name: /First Round Game/ }).click();
    await page.getByPlaceholder("e.g., Houston, TX").fill("Austin, TX");
    await page.getByRole("button", { name: /Plan My Road Trip/ }).click();
    await page.waitForURL(/trip-hq/);
    assert.equal(await page.locator(".bowl-destination-guide").count(), 0);
    await page.evaluate(() => { location.hash = "/game-day"; });
    await page.locator(".game-day-guide-grid").waitFor();
    assert.ok(guideRequests.includes("/football/venues/3616/game-day-guide"));
    assert.deepEqual(errors, []);
    console.log(`Passed host catalog, CFP search, deep links, exact-venue recommendations, trip integration, and campus-policy exclusion at ${width}px`);
    await page.close();
  }
} finally { await browser.close(); }
