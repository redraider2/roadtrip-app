import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import content from '../../src/data/destinationPicks.json' with { type: 'json' };
const baseURL = process.env.DESTINATIONS_BASE_URL || 'http://127.0.0.1:5183';
const browser = await chromium.launch({channel:'chrome',headless:true});
test.after(() => browser.close());
for (const width of [1280,390]) {
  test(`all 136 public destinations render reviewed picks at ${width}px without login`, async () => {
    const context = await browser.newContext({viewport:{width,height:900}});
    await context.route('http://localhost:5001/**', route=>route.fulfill({json:[]}));
    const page = await context.newPage(); const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    try {
      await page.goto(`${baseURL}/#/destinations`);
      for (const d of content.destinations) {
        await page.evaluate(id => {window.location.hash=`/destinations?market=${id}`;},d.destinationId);
        await expect(page.getByRole('heading',{name:`${d.market}, ${d.state}`,exact:true})).toBeVisible();
        const cards=page.locator('[data-recommendation-id]');
        const eligible=d.entries.filter(e=>e.publicationStatus==='implementation_candidate' && e.verificationStatus==='source_checked');
        await expect(cards).toHaveCount(eligible.length);
        assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.dataset.recommendationId)),eligible.map(e=>e.id));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),d.destinationId);
      }
      assert.deepEqual(errors,[]);
      await page.goto(`${baseURL}/#/destinations?market=DEST-037`);
      await expect(page.getByRole('heading',{name:'Riverbanks Zoo & Garden',exact:true})).toBeVisible();
      await page.screenshot({path:`outputs/population-release/columbia-${width}.png`,fullPage:true});
    }finally{await context.close();}
  });
}
