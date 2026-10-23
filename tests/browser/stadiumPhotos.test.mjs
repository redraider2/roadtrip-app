import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import profiles from '../../src/data/stadiumProfiles.json' with {type:'json'};
const baseURL=process.env.STADIUM_BASE_URL || 'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'chrome',headless:true});
await mkdir('outputs/stadium-rollout/screenshots',{recursive:true});
for(const width of [1440,390,320]){
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.route('http://localhost:5001/**',route=>route.fulfill({json:[]}));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${baseURL}/#/destinations`);
 for(const profile of Object.values(profiles)){
  await page.evaluate(id=>{location.hash=`/destinations?market=${id}`;},profile.destinationId);
  const hero=page.locator(`[data-stadium-venue-id="${profile.venueId}"]`);
  await expect(hero).toHaveCount(1);
  await expect.poll(()=>hero.locator('img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  await expect(hero).toContainText(profile.stadium);
  await expect(hero.locator('figcaption')).toContainText(profile.photo.creator);
  await expect(hero.locator('figcaption')).toContainText(profile.photo.license);
  await expect(hero.locator('figcaption a').first()).toHaveAttribute('href',profile.photo.sourceUrl);
  const bounds=await hero.evaluate(el=>{
   const box=el.getBoundingClientRect();const heading=el.querySelector('.route-stadium-heading').getBoundingClientRect();const sign=el.querySelector('.route-stadium-sign').getBoundingClientRect();
   const overlaps=!(heading.right<=sign.left||sign.right<=heading.left||heading.bottom<=sign.top||sign.bottom<=heading.top);
   return {overflow:document.documentElement.scrollWidth>innerWidth,signFits:sign.left>=box.left-1&&sign.right<=box.right+1,overlaps};
  });
  assert.equal(bounds.overflow,false,`${profile.school}: ${width}px page overflow`);
  assert.equal(bounds.signFits,true,`${profile.school}: ${width}px sign overflow`);
  assert.equal(bounds.overlaps,false,`${profile.school}: ${width}px heading/sign overlap`);
  if(width!==320&&['3947','3973','11823','3657'].includes(profile.venueId)){
   await hero.screenshot({path:`outputs/stadium-rollout/screenshots/${profile.venueId}-${width}.png`});
  }
 }
 assert.deepEqual(errors,[]);console.log(`${width}px: all ${Object.keys(profiles).length} destination photos and credits passed`);
 await context.close();
}
await browser.close();
