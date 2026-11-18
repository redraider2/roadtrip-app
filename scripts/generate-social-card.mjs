// Regenerate the share image from the existing brand asset and homepage copy.
// Run locally with: node scripts/generate-social-card.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const logo = await readFile(new URL("../public/kickoff-miles-logo.png", import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; } body { margin: 0; width: 1200px; height: 630px;
    background: #071c30; color: #fff; font-family: Arial, sans-serif;
    display: flex; align-items: center; gap: 45px; padding: 60px; border-bottom: 12px solid #008b45; }
    img { width: 420px; height: 420px; object-fit: contain; }
    h1 { font-size: 68px; line-height: 1.05; margin: 0 0 28px; letter-spacing: -2px; }
    p { font-size: 27px; line-height: 1.4; margin: 0; color: #dce9ef; }
    small { display: block; margin-top: 30px; font-size: 21px; color: #8cd7ae; }
  </style></head><body><img src="data:image/png;base64,${logo.toString("base64")}" alt="">
  <div><h1>Let’s Hit<br>The Road!</h1><p>Pick your team.<br>Choose a game.<br>Build the road trip.</p><small>kickoffmiles.com</small></div></body></html>`);
  await page.locator("img").evaluate((img) => img.decode());
  await page.screenshot({ path: new URL("../public/kickoff-miles-social.png", import.meta.url).pathname });
} finally { await browser.close(); }
