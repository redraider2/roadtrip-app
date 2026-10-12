import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const baseURL = process.env.DESTINATIONS_BASE_URL || 'http://127.0.0.1:5183';
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
      await page.goto(`${baseURL}/#/destinations?market=DEST-037`);
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
      await expect(page.getByRole('heading', { name: 'Highland Park Village', exact: true })).toBeVisible();
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
