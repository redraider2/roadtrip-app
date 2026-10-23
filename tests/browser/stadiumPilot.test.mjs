import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.STADIUM_BASE_URL || 'http://127.0.0.1:5196';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
test.after(() => browser.close());
await mkdir('outputs/lubbock-pilot/review', { recursive: true });

async function setup(width, venueId = 3784, authenticated = true, gameVenueId = venueId) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (authenticated) await context.addInitScript(() => localStorage.setItem('roadtrip_auth', JSON.stringify({ token: 'fixture', user: { email: 'review@example.com' } })));
  const stops = [], errors = [];
  await context.route('http://localhost:5001/**', async route => {
    const url = new URL(route.request().url()); let data = [];
    if (url.pathname === '/football/teams') data = [
      { id: 1, school: 'Baylor', mascot: 'Bears', conference: 'Big 12', logos: [] },
      { id: 2, school: 'Texas Tech', mascot: 'Red Raiders', conference: 'Big 12', logos: [] },
    ];
    if (url.pathname === '/football/games') data = [{ id: 1000, homeTeam: gameVenueId === 3784 ? 'Texas Tech' : 'Oklahoma State', awayTeam: 'Baylor', venueId: gameVenueId, venue: gameVenueId === 3784 ? 'Jones AT&T Stadium' : 'Boone Pickens Stadium', startDate: '2026-11-14T18:00:00Z' }];
    if (url.pathname === '/trips') data = [{ id: 1, title: 'Lubbock Road Trip', start_location: 'Fort Worth, TX', end_location: 'Jones AT&T Stadium, Lubbock, TX', venue_id: venueId }];
    if (url.pathname === '/trips/1/stops') {
      if (route.request().method() === 'POST') stops.push({ id: stops.length + 1, ...route.request().postDataJSON() });
      data = stops;
    }
    if (url.pathname === '/geocode') data = { latitude: 33.59, longitude: -101.87 };
    if (url.pathname === '/route') data = { geometry: [[32.75, -97.33], [33.59, -101.87]], distanceMeters: 500000, durationSeconds: 18000 };
    if (url.pathname === '/football/along-the-way') data = { places: [] };
    if (url.pathname.endsWith('/places')) data = { places: [], venue: { name: 'Jones AT&T Stadium', latitude: 33.59, longitude: -101.87, city: 'Lubbock', state: 'TX' } };
    if (url.pathname.endsWith('/featured-partner')) data = { id: 'fixture-featured', businessName: 'Review Featured Partner', websiteUrl: 'https://example.com/partner', destinationVenueIds: [String(venueId)] };
    if (url.pathname.endsWith('/featured-partners')) data = [{ id: 'fixture-local', businessName: 'Review Local Partner', websiteUrl: 'https://example.com/local', destinationVenueIds: [String(venueId)] }];
    if (url.pathname.endsWith('/game-day-guide')) data = {
      venueName: 'Jones AT&T Stadium', school: 'Texas Tech', homeTeam: 'Texas Tech',
      tailgating: { where: 'Complete\nVisit Raider Alley.', arrival: 'Arrive early.', rules: 'Follow event staff.', visitors: 'Visiting fans welcome.', sourceUrl: 'https://example.com/tailgate' },
      parkingArrival: { details: 'Use your assigned parking lot.\nFollow the arrival route.', sourceUrl: 'https://example.com/parking' },
      knowBeforeYouGo: { details: ['Review official stadium policies.'], sourceUrl: 'https://example.com/policies' },
      traditions: { details: 'Experience Raider Alley.', sourceUrl: 'https://example.com/traditions' },
    };
    await route.fulfill({ json: data });
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, stops };
}

for (const width of [1280, 820, 390, 320]) {
  test(`Lubbock journey, credits, maps and ads at ${width}px`, async () => {
    const { context, page, errors, stops } = await setup(width);
    try {
      await page.goto(`${baseURL}/#/trip-hq`);
      const figure = page.locator('[data-stadium-id="3784"]');
      await expect(figure).toBeVisible();
      await expect.poll(() => figure.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(figure.locator('.road-sign')).toContainText('Galaxy Stadium');
      await expect(figure.getByRole('link', { name: 'CC BY 2.0', exact: true })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/2.0');
      await expect(figure.locator('figcaption')).toContainText('Texas Tech University - University Student Housing');
      await expect(figure.locator('figcaption')).toContainText('cropped to fit');
      const screens = [['Trip HQ', 'trip-hq'], ['Game Weekend', 'game-weekend'], ['Game Day', 'game-day']];
      for (const [label, screen] of screens) {
        await page.goto(`${baseURL}/#/${screen}`);
        await expect(page).toHaveURL(new RegExp(`#/${screen}$`));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow on ${screen} at ${width}`);
        if (['trip-hq', 'game-weekend', 'game-day'].includes(screen)) {
          await expect(figure).toBeVisible();
          await expect(figure.locator('figcaption').getByRole('link')).toHaveCount(3);
        }
        if (['trip-hq', 'plan-route-schedule', 'drive'].includes(screen)) await expect(page.locator('.leaflet-container').first()).toBeVisible();
        if (screen !== 'plan-along-the-way') {
          await expect(page.locator('.destination-partner-rail').first()).toBeVisible();
          assert.ok(await page.locator('.destination-partner-rail').first().locator('.partner-placement, .destination-discovery-card').count() >= 5);
        }
        if (screen === 'game-weekend') {
          const cactus = page.locator('[data-partner-id="cactus_theater"][data-placement="game_weekend"]');
          await expect(cactus).toHaveCount(1);
          await expect(cactus.getByRole('link', { name: 'VIEW EVENTS', exact: true })).toHaveAttribute('href', 'https://cactustheater.com/events/');
          await cactus.getByRole('button', { name: 'SAVE TO TRIP', exact: true }).click();
          await expect(cactus.getByRole('button', { name: '✓ SAVED TO TRIP' })).toBeDisabled();
          assert.equal(stops[0].name, 'Cactus Theater');
          await expect(page.getByRole('heading', { name: /Game Day Eats/ })).toBeVisible();
          await expect(page.getByRole('heading', { name: /Fan Bars/ })).toBeVisible();
          await expect(page.getByRole('heading', { name: /Stay Near the Stadium/ })).toBeVisible();
        }
        if (screen === 'game-day') {
          await expect(page.locator('[data-partner-id="cactus_theater"]')).toHaveCount(0);
          await expect(page.getByRole('heading', { name: 'Review Featured Partner' })).toBeVisible();
          for (const [section, copy] of [['Parking & Arrival', 'Use your assigned parking lot.'], ['Know Before You Go', 'Review official stadium policies.'], ['Game Day Traditions', 'Experience Raider Alley.'], ['Tailgating', 'Visit Raider Alley.']]) {
            await page.locator('.game-day-guide-card').filter({ has: page.getByRole('heading', { name: section, exact: true }) }).click();
            await expect(page.locator('.tailgating-guide-panel')).toContainText(copy);
          }
          assert.ok(!(await page.locator('.tailgating-guide-panel').innerText()).includes('Complete'));
        }
        if ([1280, 390].includes(width) && ['trip-hq', 'game-weekend', 'game-day'].includes(screen)) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: `outputs/lubbock-pilot/review/${screen}-${width}.png` });
        }
      }
      const events = await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]'));
      assert.ok(events.some(e => e.partner_id === 'cactus_theater' && e.action === 'save_to_trip'));
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test('public Lubbock has its photograph and credit; another market has no Lubbock branding', async () => {
  const { context, page, errors } = await setup(390, 3784, false);
  try {
    await page.goto(`${baseURL}/#/destinations?market=DEST-008`);
    await expect(page.locator('.stadium-identity')).toContainText('Galaxy Stadium');
    await expect(page.locator('.stadium-photo-credit')).toBeVisible();
    await page.getByRole('searchbox').fill('SMU');
    await page.getByRole('navigation', { name: 'Destinations', exact: true }).getByRole('link').click();
    await expect(page.locator('.stadium-identity')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Dallas, TX', exact: true })).toBeVisible();
    await page.goto(`${baseURL}/#/home`);
    await expect(page.locator('.stadium-identity')).toHaveCount(0);
    await page.getByRole('button', { name: 'Choose Your Team', exact: true }).click();
    await page.getByRole('searchbox').fill('Baylor');
    await page.getByRole('button', { name: /Baylor Bears/ }).click();
    await expect(page.getByRole('heading', { name: 'Choose Your Game' })).toBeVisible();
    await expect(page.locator('.stadium-identity')).toHaveCount(0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('unavailable stadium photo falls back cleanly without a broken image', async () => {
  const { context, page } = await setup(390);
  try {
    await context.route('**/stadiums/texas-tech-2013.jpg', route => route.abort());
    await page.goto(`${baseURL}/#/game-weekend`);
    await expect(page.locator('.stadium-identity')).toContainText('Stadium photo unavailable. Galaxy Stadium');
    await expect(page.locator('.stadium-identity img')).toHaveCount(0);
    await expect(page.locator('.stadium-identity .road-sign')).toBeVisible();
  } finally { await context.close(); }
});

test('selected away-game destination cannot inherit an older Lubbock trip photo', async () => {
  const { context, page } = await setup(390, 3784, true, 3947);
  try {
    await page.goto(`${baseURL}/#/home`);
    await page.getByRole('button', { name: 'Choose Your Team', exact: true }).click();
    await page.getByRole('searchbox').fill('Baylor');
    await page.getByRole('button', { name: /Baylor Bears/ }).click();
    await expect(page.locator('.game-destination')).toContainText('Boone Pickens Stadium');
    await page.locator('.game-destination').click();
    await page.evaluate(() => { window.location.hash = '#/game-weekend'; });
    await expect(page.getByRole('heading', { name: 'Game Weekend', exact: true })).toBeVisible();
    await expect(page.locator('.stadium-identity')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Kickoff Miles journey' }).getByRole('button', { name: 'Trip HQ', exact: true }).click();
    await expect(page.locator('.stadium-identity')).toContainText('Galaxy Stadium');
  } finally { await context.close(); }
});
