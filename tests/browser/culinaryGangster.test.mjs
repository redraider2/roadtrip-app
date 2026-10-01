import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Run against `npm run dev` (or set CULINARY_BASE_URL to a preview server).
// API fixtures keep this visual/interaction test independent of production data.
const baseURL = process.env.CULINARY_BASE_URL || 'http://127.0.0.1:5180';
const screens = { trip_hq: 'trip-hq', along_the_way: 'plan-along-the-way', game_weekend: 'game-weekend', game_day: 'game-day' };
const creatives = {trip_hq:'directions', along_the_way:'game_day', game_weekend:'menu', game_day:'game_day'};
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
await mkdir('outputs/culinary-tempe', { recursive: true });
test.after(() => browser.close());

async function setup(width = 1280, venueId = 3947) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('roadtrip_auth', JSON.stringify({ token: 'fixture', user: { email: 'review@example.com' } })));
  const stops = [], saves = [], errors = [];
  let failSave = false;
  await context.route('https://culinarygangsterusa.com/**', r => r.fulfill({ body: 'Events destination' }));
  await context.route('https://www.google.com/maps/**', r => r.fulfill({ body: 'Directions destination' }));
  await context.route('http://localhost:5001/**', async r => {
    const u = new URL(r.request().url()); let data = [];
    if (u.pathname === '/trips') data = [{ id: 1, title: 'Tempe Road Trip', start_location: 'Austin, TX', end_location: 'Tempe, AZ', venue_id: venueId }, {id: 2, title:'Lubbock Road Trip', start_location:'Austin, TX', end_location:'Lubbock, TX', venue_id:3784}];
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

const selector = '[data-campaign-id="culinary_gangster_tempe"]';
async function navigate(page, screen) {
  await page.evaluate(screen => { history.pushState(null, '', `#/${screen}`); dispatchEvent(new PopStateEvent('popstate')); }, screen);
}
for (const width of [1280, 820, 390, 320]) {
  test(`four separate Tempe placements and CTAs at ${width}px`, async () => {
    const {context, page} = await setup(width);
    try {
      for (const [placement, screen] of Object.entries(screens)) {
        await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
        const ad = page.locator(selector);
        await expect(ad).toHaveCount(1); await ad.scrollIntoViewIfNeeded();
        await expect(ad).toHaveAttribute('data-placement', placement);
        await expect(ad).toHaveAttribute('data-creative', creatives[placement]);
        await expect.poll(() => ad.locator('img').evaluate(img => img.complete && img.naturalWidth === 1536)).toBe(true);
        const box = await ad.locator('img').boundingBox();
        assert.ok(Math.abs(box.width / box.height - 1.5) < 0.01);
        assert.ok(box.x >= 0 && box.x + box.width <= width);
        if (width === 1280) {
          const layout = await ad.locator('.destination-artwork-layout').boundingBox();
          assert.ok(Math.abs(box.width / (layout.width - 24) - (placement === 'game_day' ? 0.4 : 1.85 / 2.85)) < 0.02);
        }
        if (placement !== 'game_day') {
          const layout = await ad.locator('.destination-artwork-layout').boundingBox();
          if (layout.width <= 720) {
            assert.ok(Math.abs(box.width - layout.width) < 1, 'artwork fills narrow card');
            const copy = await ad.locator('.destination-artwork-copy').boundingBox();
            assert.ok(copy.y >= box.y + box.height, 'details stack below artwork');
          } else {
            assert.ok(Math.abs(box.width / (layout.width - 24) - 1.85 / 2.85) < 0.02);
          }
        }
        await expect(page.getByText('Destination Partner Network — Coming Soon', {exact:true})).toHaveCount(0);
        if (placement === 'game_weekend') assert.ok(await ad.evaluate(el => el.nextElementSibling?.classList.contains('destination-map-section')));
        await expect(ad.getByText('Sponsored · Tempe', {exact:true})).toBeVisible();
        await expect(ad.locator('h3')).toHaveText('Culinary Gangster');
        if (placement === 'along_the_way') await expect(ad.getByRole('heading', {name:'When you reach Tempe'})).toBeVisible();
        assert.equal(await ad.locator('img').evaluate(img => getComputedStyle(img).objectFit), 'contain');
        const imageLink = ad.locator('.destination-artwork-image');
        await imageLink.focus();
        assert.notEqual(await imageLink.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
        const imageClicksBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe' && e.action !== 'impression').length);
        const popupPromise = context.waitForEvent('page');
        await imageLink.press('Enter'); const popup = await popupPromise; await popup.waitForLoadState();
        if (creatives[placement] === 'directions') assert.equal(new URL(popup.url()).searchParams.get('destination'), '501 S Mill Avenue, Tempe, AZ');
        else assert.equal(popup.url(), 'https://culinarygangsterusa.com/menu/tempe');
        await popup.close();
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe' && e.action !== 'impression').length), imageClicksBefore + 1);
        for (const link of await ad.locator('.destination-artwork-actions a').all()) {
          const before = await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe' && e.action !== 'impression').length);
          await link.focus(); assert.notEqual(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
          const next = context.waitForEvent('page'); await link.press('Enter'); const target = await next; await target.waitForLoadState();
          assert.equal(target.url(), await link.getAttribute('href')); await target.close();
          const after = await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe' && e.action !== 'impression').length);
          assert.equal(after - before, 1);
        }

        await expect.poll(() => page.evaluate(placement => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe' && e.placement === placement && e.action === 'impression' && e.destination_id === '3947').length, placement)).toBeGreaterThan(0);
        if (width !== 320) await ad.screenshot({path:`outputs/culinary-tempe/${placement}-${width}.png`});
      }
    } finally { await context.close(); }
  });
}
test('same-session Tempe -> Lubbock -> Tempe and global screens cannot retain campaign', async () => {
  const {context, page} = await setup();
  const events = () => page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe').length);
  try {
    await page.goto(`${baseURL}/#/trip-hq`);
    await expect(page.locator(selector)).toHaveCount(1);
    await page.locator(selector).scrollIntoViewIfNeeded();
    await expect.poll(events).toBeGreaterThan(0);
    await navigate(page, 'home');
    await page.locator('.home-account-access > summary').click();
    await page.locator('#saved-trips').getByText('Lubbock Road Trip', {exact:true}).click();
    await expect(page.locator('#trip-hq-title')).toContainText('Lubbock');
    const count = await events();
    for (const screen of [...Object.values(screens), 'home', 'choose-team', 'plan-stay-itinerary']) {
      await navigate(page, screen);
      await expect(page.locator(selector)).toHaveCount(0);
      assert.equal(await events(), count);
    }
    await navigate(page, 'home');
    await page.locator('.home-account-access > summary').click();
    await page.locator('#saved-trips').getByText('Tempe Road Trip', {exact:true}).click();
    await expect(page.locator(selector)).toHaveCount(1);
    await page.locator(selector).scrollIntoViewIfNeeded();
    await expect.poll(events).toBeGreaterThan(count);
    for (const screen of ['home', 'choose-team', 'plan-stay-itinerary']) {
      await navigate(page, screen); await expect(page.locator(selector)).toHaveCount(0);
    }
  } finally { await context.close(); }
});
test('direct navigation for non-Tempe destination has no campaign or impressions', async () => {
  const {context, page} = await setup(390, 3784);
  try {
    for (const screen of Object.values(screens)) {
      await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
      await expect(page.locator('body')).toContainText(screen === 'game-day' ? 'Your Game Day Guide' : screen === 'game-weekend' ? 'Game Weekend' : screen === 'plan-along-the-way' ? 'Along the Way' : 'Tempe Road Trip');
      await expect(page.locator(selector)).toHaveCount(0);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kickoff_miles_partner_events') || '[]').filter(e => e.campaign_id === 'culinary_gangster_tempe').length), 0);
    }
  } finally { await context.close(); }
});

test('active Tempe sponsor preserves real destination listings', async () => {
  const {context, page} = await setup();
  await context.route('**/football/venues/*/featured-partners', r => r.fulfill({json:[{
    id:'fixture-real-partner', businessName:'Existing Local Partner', websiteUrl:'https://example.org/partner',
  }]}));
  try {
    for (const screen of ['trip-hq','game-weekend','game-day']) {
      await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.getByRole('heading', {name:'Existing Local Partner', exact:true})).toBeVisible();
      await expect(page.getByText('Destination Partner Network — Coming Soon', {exact:true})).toHaveCount(0);
    }
  } finally { await context.close(); }
});
