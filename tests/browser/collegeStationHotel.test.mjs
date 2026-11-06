import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Run against `npm run dev` (or set CULINARY_BASE_URL to a preview server).
// API fixtures keep this visual/interaction test independent of production data.
const baseURL = process.env.HOTEL_BASE_URL || 'http://127.0.0.1:5180';
const screens = { trip_hq: 'trip-hq', along_the_way: 'plan-along-the-way', game_weekend: 'game-weekend', game_day: 'game-day' };
const creatives = {trip_hq:'campus_home_base', along_the_way:'arrival', game_weekend:'weekend_stay', game_day:'maroon_96'};
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : { channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' }), headless: true });
await mkdir('outputs/college-station-hotel', { recursive: true });
test.after(() => browser.close());

async function setup(width = 1280, venueId = 3795) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('roadtrip_auth', JSON.stringify({ token: 'fixture', user: { email: 'review@example.com' } })));
  const stops = [], saves = [], errors = [];
  let failSave = false;
  await context.route('https://www.texasamhotelcc.com/**', r => r.fulfill({ body: 'Events destination' }));
  await context.route('https://www.google.com/maps/**', r => r.fulfill({ body: 'Directions destination' }));
  await context.route('http://localhost:5001/**', async r => {
    const u = new URL(r.request().url()); let data = [];
    if (u.pathname === '/trips') data = [{ id: 1, title: 'College Station Road Trip', start_location: 'Austin, TX', end_location: 'College Station, TX', venue_id: venueId }, {id: 2, title:'Lubbock Road Trip', start_location:'Austin, TX', end_location:'Lubbock, TX', venue_id:3784}];
    if (u.pathname === '/trips/1/stops') {
      if (r.request().method() === 'POST') {
        if (failSave) return r.fulfill({ status: 500, json: { error: 'Fixture save failed' } });
        const stop = r.request().postDataJSON(); saves.push(stop); stops.push({ id: stops.length + 1, ...stop });
      }
      data = stops;
    }
    if (u.pathname === '/geocode') data = { latitude: 33.578, longitude: -101.844 };
    if (u.pathname === '/route') data = { geometry: [[30.267,-97.743],[33.58,-101.85]], distanceMeters: 600000, durationSeconds: 22000 };
    if (u.pathname.endsWith('/places')) data = { places: u.searchParams.get('category') === 'hotel' ? [
      {id:'other-one',name:'Alternative Hotel One',latitude:30.6,longitude:-96.3,website:'https://example.com'},
      {id:'am-hotel',name:'Texas A&M Hotel and Conference Center',latitude:30.61,longitude:-96.34,website:'https://www.texasamhotelcc.com/'},
      {id:'other-two',name:'Alternative Hotel Two'},
      {id:'other-three',name:'Alternative Hotel Three'},
    ] : [], venue: { name: 'Jones AT&T Stadium', latitude: 33.591, longitude: -101.872, city: 'Lubbock', state: 'TX' } };
    if (u.pathname.endsWith('/featured-partner')) data = null;
    if (u.pathname.endsWith('/game-day-guide')) data = { venueName: 'Jones AT&T Stadium', homeTeam: 'Texas Tech' };
    await r.fulfill({ json: data });
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  return { context, page, saves, errors, setFailSave: value => { failSave = value; } };
}

const selector = '[data-campaign-id="texas_am_hotel_college_station"]';
for (const width of [1280, 390]) {
  test(`four College Station hotel placements render and link at ${width}px`, async () => {
    const {context, page, errors} = await setup(width);
    try {
      for (const [placement, screen] of Object.entries(screens)) {
        await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
        const ad=page.locator(selector);
        await expect(ad).toHaveCount(1);
        await ad.scrollIntoViewIfNeeded();
        await expect(ad).toHaveAttribute('data-creative',creatives[placement]);
        await expect(ad.getByText('Sponsored · College Station',{exact:true})).toBeVisible();
        await expect(ad.locator('h3')).toHaveText('Texas A&M Hotel and Conference Center');
        const picture=ad.locator('svg');
        await expect(picture).toBeVisible();
        const box=await picture.boundingBox();
        assert.ok(box.width>100 && box.height>50 && box.x>=0 && box.x+box.width<=width);
        const layout=await ad.locator('.destination-artwork-layout').boundingBox();
        const footer=await ad.locator('.destination-artwork-copy').boundingBox();
        assert.ok(Math.abs(box.width-layout.width)<1,'hotel artwork fills the entire card width');
        assert.ok(footer.y>=box.y+box.height,'booking footer sits below the enlarged artwork');
        assert.ok(footer.height<140,'booking footer stays compact');
        assert.equal(await ad.locator('.destination-artwork-image').getAttribute('href'),'https://www.texasamhotelcc.com/');
        const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('kickoff_miles_partner_events')||'[]').filter(e=>e.campaign_id==='texas_am_hotel_college_station' && e.action==='book_now').length);
        const popupPromise=context.waitForEvent('page');
        await ad.getByRole('link',{name:'Book Now — Texas A&M Hotel and Conference Center (opens in a new tab)',exact:true}).click();
        const popup=await popupPromise;await popup.waitForLoadState();
        assert.equal(popup.url(),'https://www.texasamhotelcc.com/');await popup.close();
        const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('kickoff_miles_partner_events')||'[]').filter(e=>e.campaign_id==='texas_am_hotel_college_station' && e.action==='book_now').length);
        assert.equal(after,before+1);
        await ad.screenshot({path:`outputs/college-station-hotel/${placement}-${width}.png`});
      }
      assert.deepEqual(errors,[]);
    } finally {await context.close();}
  });
}
test('destination browser features hotel for SEC College Station only',async()=>{
 const {context,page}=await setup();
 try{
  await page.goto(`${baseURL}/#/destinations?market=DEST-013`);
  await expect(page.locator(selector)).toHaveCount(1);
  await expect(page.locator(selector)).toHaveAttribute('data-creative','campus_home_base');
  await page.goto(`${baseURL}/#/destinations?market=DEST-014`);
  await expect(page.locator(selector)).toHaveCount(0);
 }finally{await context.close();}
});
test('non-College-Station trips cannot show hotel in any placement',async()=>{
 const {context,page}=await setup(390,3784);
 try{for(const screen of Object.values(screens)){
  await page.goto(`${baseURL}/#/${screen}`);
  await expect(page.locator('body')).toContainText(screen==='game-day'?'Your Game Day Guide':screen==='game-weekend'?'Game Weekend':screen==='plan-along-the-way'?'Along the Way':'College Station Road Trip');
  await expect(page.locator(selector)).toHaveCount(0);
 }}finally{await context.close();}
});

for (const width of [1280,390]) {
  test(`sponsored hotel leads category list with two alternatives at ${width}px`, async () => {
    const {context,page} = await setup(width);
    try {
      await page.goto(`${baseURL}/?review=game-weekend#/game-weekend`);
      const column = page.locator('.recommendation-column').filter({has:page.getByRole('heading',{name:'🛏 Stay Near the Stadium',exact:true})});
      const rows = column.locator('.trip-row');
      await expect(rows).toHaveCount(3);
      await expect(rows.first().getByText('Texas A&M Hotel & Conference Center',{exact:true})).toBeVisible();
      await expect(rows.first().getByText('Kickoff Miles Pick · Sponsored Partner',{exact:true})).toBeVisible();
      await expect(rows.nth(1)).toContainText('Alternative Hotel One');
      await expect(rows.nth(2)).toContainText('Alternative Hotel Two');
      await expect(rows.first().getByRole('link',{name:'Visit website'})).toHaveAttribute('href','https://www.texasamhotelcc.com/');
      for (const screen of ['trip-hq','plan-along-the-way','game-day']) {
        await page.goto(`${baseURL}/?review=${screen}#/${screen}`);
        await expect(page.getByText('Kickoff Miles Pick · Sponsored Partner',{exact:true})).toHaveCount(0);
        await expect(page.getByRole('heading',{name:/Hotels Along the Route|Overnight Options/})).toHaveCount(0);
        await expect(page.locator(selector)).toHaveCount(1);
      }
    } finally { await context.close(); }
  });
}
test('another destination retains hotel API ordering without sponsorship',async()=>{
  const {context,page} = await setup(1280,3784);
  try {
    await page.goto(`${baseURL}/?review=game-weekend#/game-weekend`);
    const column=page.locator('.recommendation-column').filter({has:page.getByRole('heading',{name:'🛏 Stay Near the Stadium',exact:true})});
    await expect(column.locator('.trip-row').first()).toContainText('Alternative Hotel One');
    await expect(page.getByText('Kickoff Miles Pick · Sponsored Partner',{exact:true})).toHaveCount(0);
  } finally {await context.close();}
});
