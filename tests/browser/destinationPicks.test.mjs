import test from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseURL = process.env.PICKS_BASE_URL || "http://127.0.0.1:5180";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true });
test.after(() => browser.close());
const venues = [[3784, "Lubbock"], [3947, "Tempe"], [4728, "Houston"], [3895, "Houston"], [3604, "San Antonio"], [3910, "Austin"], [3994, "Columbia"], [3795, "College Station / Bryan"], [4727, "Waco"]];

async function setup(width, venueId, market) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("roadtrip_auth", JSON.stringify({ token: "fixture", user: { email: "review@example.com" } })));
  await context.route("http://localhost:5001/**", async (route) => {
    const url = new URL(route.request().url());
    let data = [];
    if (url.pathname === "/trips") data = [{ id: 1, title: `${market} Road Trip`, start_location: "Dallas, TX", end_location: market, venue_id: venueId }];
    if (url.pathname === "/geocode") data = { latitude: 33.578, longitude: -101.844 };
    if (url.pathname === "/route") data = { geometry: [[30.267, -97.743], [33.58, -101.85]], distanceMeters: 600000, durationSeconds: 22000 };
    if (url.pathname.endsWith("/places")) data = { places: [], venue: { name: "Fixture Stadium", latitude: 33.591, longitude: -101.872, city: market, state: "TX" } };
    if (url.pathname.endsWith("/featured-partner")) data = null;
    if (url.pathname.endsWith("/game-day-guide")) data = { venueName: "Fixture Stadium", homeTeam: market };
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, errors };
}

for (const width of [1280, 390]) {
  test(`all nine venues show six picks on desktop/mobile (${width}px)`, async () => {
    for (const [venueId, market] of venues) {
      const { context, page, errors } = await setup(width, venueId, market);
      try {
        await page.goto(`${baseURL}/#/trip-hq`);
        const picks = page.locator(".destination-picks");
        await expect(picks).toHaveCount(1);
        await expect(picks.locator(".destination-pick")).toHaveCount(6);
        await expect(picks).toContainText(market);
        await picks.scrollIntoViewIfNeeded();
        for (const card of await picks.locator(".destination-pick").all()) {
          const box = await card.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
        }
        for (const link of await picks.getByRole("link").all()) {
          assert.equal(new URL(await link.getAttribute("href")).protocol, "https:");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        const sponsor = page.locator(venueId === 3947 ? '[data-campaign-id="culinary_gangster_tempe"]' : '[data-partner-id="cactus_theater"]');
        if ([3947, 3784].includes(venueId)) {
          await expect(sponsor).toHaveCount(1);
          const partnerBox = await sponsor.boundingBox();
          assert.ok(partnerBox.y < (await picks.boundingBox()).y);
        }
        if (venueId === 3994) {
          await expect(picks).toContainText("Riverbanks Zoo & Garden");
          await expect(picks).not.toContainText("Columbia Craft");
          await mkdir("outputs/picks", { recursive: true });
          await picks.screenshot({ path: `outputs/picks/columbia-${width}.png` });
        }
        assert.deepEqual(errors, []);
      } finally { await context.close(); }
    }
  });
}

test("picks appear on itinerary/weekend screens and stay hidden for unsupported destinations", async () => {
  for (const venueId of [3947, 9999]) {
    const { context, page } = await setup(390, venueId, "Fixture");
    try {
      for (const screen of ["plan-stay-itinerary", "game-weekend"]) {
        await page.goto(`${baseURL}/#/${screen}`);
        await expect(page.locator(".destination-picks")).toHaveCount(venueId === 3947 ? 1 : 0);
      }
    } finally { await context.close(); }
  }
});
