import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Run against `npm run dev` (or set CACTUS_BASE_URL to a preview server).
// API fixtures keep this visual/interaction test independent of production data.
const baseURL = process.env.CACTUS_BASE_URL || 'http://127.0.0.1:5173';
const screens = { trip_hq: 'trip-hq', stay_itinerary: 'plan-stay-itinerary', game_weekend: 'game-weekend' };
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
await mkdir('outputs/cactus-pilot', { recursive: true });
test.after(() => browser.close());

async function setup(width = 1280, venueId = 3784) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('roadtrip_auth', JSON.stringify({ token: 'fixture', user: { email: 'review@example.com' } })));
  const stops = [], saves = [], errors = [];
  let failSave = false;
  await context.route('https://cactustheater.com/**', r => r.fulfill({ body: 'Events destination' }));
  await context.route('https://www.google.com/maps/**', r => r.fulfill({ body: 'Directions destination' }));
  await context.route('http://localhost:5001/**', async r => {
    const u = new URL(r.request().url()); let data = [];
    if (u.pathname === '/trips') data = [{ id: 1, title: 'Lubbock Road Trip', start_location: 'Austin, TX', end_location: 'Lubbock, TX', venue_id: venueId }];
    if (u.pathname === '/trips/1/stops') {
      if (r.request().method() === 'POST') {
        if (failSave) return r.fulfill({ status: 500, json: { error: 'Fixture save failed' } });
        const stop = r.request().postDataJSON(); saves.push(stop); stops.push({ id: stops.length + 1, ...stop });
      }
      data = stops;
    }
    if (u.pathname === '/geocode') data = { latitude: 33.578, longitude: -101.844 };
    if (u.pathname === '/route') data = { geometry: [[30.267,-97.743],[33.58,-101.85]], distanceMeters: 600000, durationSeconds: 22000 };
    if (u.pathname.endsWith('/places')) data = { places: [], venue: { name: 'Jones AT&T Stadium', latitude: 33.591, longitude: -101.872, city: 'Lubbock', state: 'TX' } };
    if (u.pathname.endsWith('/featured-partner')) data = null;
    if (u.pathname.endsWith('/game-day-guide')) data = { venueName: 'Jones AT&T Stadium', homeTeam: 'Texas Tech' };
    await r.fulfill({ json: data });
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  return { context, page, saves, errors, setFailSave: value => { failSave = value; } };
}

for (const width of [1280, 390, 320]) {
  test(`all placements render and track at ${width}px`, async () => {
    const { context, page, errors } = await setup(width);
    try {
      for (const [placement, screen] of Object.entries(screens)) {
        await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
        const card = page.locator(`[data-partner-id="cactus_theater"][data-placement="${placement}"]`);
        await expect(card).toHaveCount(1); await card.scrollIntoViewIfNeeded();
        await expect(card).toBeVisible();
        await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
        assert.equal(await card.evaluate(el => el.scrollWidth <= el.clientWidth), true);
        for (const button of await card.locator('a,button').all()) {
          const box = await button.boundingBox(); assert.ok(box.height >= 44);
          assert.ok(box.x >= 0 && box.x + box.width <= width);
        }
        await expect(card.getByRole('link', { name: 'VIEW EVENTS' })).toHaveAttribute('target', '_blank');
        await expect(card.getByRole('link', { name: 'VIEW EVENTS' })).toHaveAttribute('href', 'https://cactustheater.com/events/');
        await expect(card.getByRole('button')).toHaveCount(placement === 'trip_hq' ? 0 : 1);
        await expect(card.getByRole('link', { name: 'DIRECTIONS' })).toHaveCount(placement === 'game_weekend' ? 1 : 0);
        assert.doesNotMatch(await card.innerText(), /prorated|\$|package|complimentary|sales/i);
        const primary = placement === 'trip_hq' ? '.trip-hq-workspace > .panel' : placement === 'stay_itinerary' ? '.plan-itinerary-timeline' : '.destination-panel';
        assert.ok(await page.locator(primary).first().evaluate((el, top) => el.getBoundingClientRect().bottom <= top, (await card.boundingBox()).y));
        await expect.poll(async () => page.evaluate(p => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.partner_id === 'cactus_theater' && e.placement === p && e.action === 'impression').length, placement)).toBeGreaterThan(0);
        if (width !== 320) await card.locator('..').screenshot({ path: `outputs/cactus-pilot/${placement}-${width}.png` });
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('CTAs open configured destinations; saves use existing API, handle failures, and survive screen changes', async () => {
  const { context, page, saves, setFailSave } = await setup();
  try {
    await page.goto(`${baseURL}/#/game-weekend`);
    const card = page.locator('[data-partner-id="cactus_theater"]'); await expect(card).toBeVisible();
    for (const label of ['VIEW EVENTS', 'DIRECTIONS']) {
      const popupPromise = context.waitForEvent('page');
      await card.getByRole('link', { name: label }).click(); const popup = await popupPromise;
      await popup.waitForLoadState();
      if (label === 'DIRECTIONS') assert.equal(new URL(popup.url()).searchParams.get('destination'), '1812 Buddy Holly Ave., Lubbock, TX 79401');
      else assert.equal(popup.url(), 'https://cactustheater.com/events/');
      await popup.close();
    }
    setFailSave(true); await card.getByRole('button', { name: 'SAVE TO TRIP', exact: true }).click();
    await expect(card.getByRole('alert')).toContainText('Could not save'); assert.equal(saves.length, 0);
    setFailSave(false); await card.getByRole('button', { name: 'SAVE TO TRIP', exact: true }).click();
    await expect(card.getByRole('button', { name: '✓ SAVED TO TRIP' })).toBeDisabled();
    assert.equal(saves.length, 1); assert.equal(saves[0].name, 'Cactus Theater'); assert.equal(saves[0].is_route_stop, false);
    await page.goto(`${baseURL}/#/plan-stay-itinerary`);
    await expect(page.locator('[data-partner-id="cactus_theater"]').getByRole('button', { name: '✓ SAVED TO TRIP' })).toBeDisabled();
    await page.goto(`${baseURL}/#/trip-hq`); await expect(page.getByText('Cactus Theater', { exact: true }).first()).toBeVisible();
    const events = await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events')).filter(e => e.partner_id === 'cactus_theater'));
    for (const action of ['impression', 'view_events', 'directions', 'save_to_trip']) assert.ok(events.some(e => e.action === action && e.market === 'lubbock' && e.creative === 'featured' && e.placement === 'game_weekend'));
  } finally { await context.close(); }
});

test('Cactus is absent from Game Day and other destinations', async () => {
  for (const venue of [3784, 9999, null]) {
    const { context, page } = await setup(1280, venue);
    try {
      for (const screen of venue === 3784 ? ['game-day'] : Object.values(screens)) {
        const tripsLoaded = page.waitForResponse(r => new URL(r.url()).pathname === '/trips');
        await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
        await tripsLoaded;
        await page.waitForTimeout(200);
        await expect(page.locator('[data-partner-id="cactus_theater"]')).toHaveCount(0);
      }
    } finally { await context.close(); }
  }
});
