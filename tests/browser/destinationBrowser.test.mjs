import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
test.after(() => browser.close());
for (const width of [1280, 390]) {
  test(`public destination links and roster at ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('http://localhost:5001/**', route => route.fulfill({ json: [] }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto('http://127.0.0.1:5183/#/destinations?market=DEST-037');
      await expect(page.getByRole('heading', { name: 'Columbia, SC', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Riverbanks Zoo & Garden', exact: true })).toBeVisible();
      await expect(page.locator('[data-recommendation-id]')).toHaveCount(6);
      await expect(page.getByRole('navigation', { name: 'Destinations' }).getByRole('link')).toHaveCount(136);
      await page.getByRole('searchbox').fill('Houston');
      await expect(page.getByRole('navigation', { name: 'Destinations' }).getByRole('link')).toHaveCount(3);
      await page.getByRole('searchbox').fill('SMU');
      await page.getByRole('navigation', { name: 'Destinations' }).getByRole('link').click();
      await expect(page.getByRole('heading', { name: 'Dallas, TX', exact: true })).toBeVisible();
      await expect(page.locator('[data-recommendation-id]')).toHaveCount(6);
      await expect(page.locator('[data-recommendation-id]').first()).toContainText('Highland Park Village');
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Dallas, TX', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '← Home' }).click();
      await page.getByRole('button', { name: 'Explore Destinations', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Explore Destinations', exact: true })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: `/tmp/destination-browser-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}


test('every public market link renders eligible local content without an account',async()=>{
  const {default: content}=await import('../../src/data/destinationPicks.json',{with:{type:'json'}});
  for(const width of [1280,390]){
    const context=await browser.newContext({viewport:{width,height:900}});
    await context.route('http://localhost:5001/**',route=>route.fulfill({json:[]}));
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      let total=0;
      for(const d of content.destinations){
        await page.goto(`http://127.0.0.1:5183/#/destinations?market=${d.destinationId}`);
        await expect(page.getByRole('heading',{name:`${d.market}, ${d.state}`,exact:true})).toBeVisible();
        const eligible=d.entries.filter(e=>e.verificationStatus==='source_checked'&&e.publicationStatus==='implementation_candidate'&&(!e.venuePolicyScope||e.venuePolicyScope.includes(d.destinationVenueIds[0])));
        await expect(page.locator('.destination-browser-picks [data-recommendation-id]')).toHaveCount(eligible.length);total+=eligible.length;
        for(const e of eligible)await expect(page.locator(`[data-recommendation-id="${e.id}"]`)).toContainText(e.title);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
        if(d.destinationId==='DEST-015')await expect(page.locator('[data-campaign-id="culinary_gangster_tempe"]')).toHaveCount(1);
        if(d.destinationId==='DEST-008')await expect(page.locator('[data-partner-id="cactus_theater"]')).toHaveCount(1);
      }
      assert.equal(total,815);assert.deepEqual(errors,[]);
      await page.goto('http://127.0.0.1:5183/#/destinations?market=DEST-065');
      await expect(page.getByRole('heading',{name:'Miami Lakes Hotel on Main',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Stadium Hotel',exact:true})).toHaveCount(0);
      await page.goto('http://127.0.0.1:5183/#/destinations?market=DEST-133');
      await expect(page.getByRole('heading',{name:/Moe/})).toBeVisible();
      await page.screenshot({path:`/tmp/national-destinations-${width}.png`,fullPage:true});
    }finally{await context.close();}
  }
});
