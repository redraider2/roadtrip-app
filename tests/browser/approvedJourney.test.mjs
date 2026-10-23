import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const fixture=await readFile(new URL('./fixtures/approvedJourney.js',import.meta.url),'utf8');
const baseURL=process.env.JOURNEY_BASE_URL || 'http://127.0.0.1:5173';
const b=await chromium.launch({channel:'chrome'});
for(const width of [1440,768,390,320]){
 const p=await b.newPage({viewport:{width,height:1000}});await p.addInitScript(fixture);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${baseURL}/#/plan-route-schedule`);await p.locator('.route-next-step').waitFor();
 for(const screen of ['home','trip-hq','plan-route-schedule','plan-along-the-way','plan-stay-itinerary','drive','game-weekend','game-day']){
  await p.evaluate(s=>{location.hash='/'+s;},screen);await p.waitForTimeout(400);
  if(['game-weekend','game-day'].includes(screen)){await p.locator('.route-stadium-feature img').waitFor();if(!await p.locator('.route-stadium-feature img').evaluate(i=>i.complete&&i.naturalWidth>0))throw Error('Photo missing');}
  const check=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,dark:[...document.querySelectorAll('.panel,.plan-day-content,.drive-map-hero,.drive-today,.drive-arrival,.game-day-guide-card,.tailgating-guide-panel')].filter(e=>{const c=getComputedStyle(e).backgroundColor.match(/[\d.]+/g);return c&&c.length>=3&&(c.length<4||Number(c[3])>0)&&Math.max(...c.slice(0,3).map(Number))<90&&e.getBoundingClientRect().height>0;}).map(e=>e.className)}));
  assert.equal(check.overflow,false,`${screen} overflows at ${width}px`);
  if(screen!=='home') assert.deepEqual(check.dark,[],`${screen} contains a dark panel`);
  assert.deepEqual(errors,[],`${screen} has JavaScript errors`);
  if(screen==='home') {assert.equal(await p.locator('.default-roadtrip-background').isVisible(),true);}
  if(screen==='plan-along-the-way') {await p.getByRole('button',{name:'Explore game weekend in Lubbock, TX'}).click();assert.match(p.url(),/game-weekend/);}
  console.log(JSON.stringify({width,screen,...check,errors}));
  if(width===1440||width===390)await p.screenshot({path:`outputs/layout-test/main-${screen}-${width}.png`,fullPage:true});
 }
 await p.close();
}
const selected=await b.newPage();await selected.addInitScript(fixture);
await selected.goto(`${baseURL}/#/choose-team`);
await selected.locator('.team-choice').filter({hasText:'TCU'}).click();
await selected.locator('.game-destination').click();
await selected.evaluate(()=>{location.hash='/home';});
await selected.locator('.default-roadtrip-background').waitFor();
assert.equal(await selected.locator('.team-background').count(),0);
console.log('Home retains stadium background after selecting a team and game');
await selected.close();
const other=await b.newPage();await other.addInitScript(fixture.replaceAll('3784','9999'));
await other.goto(`${baseURL}/#/game-day`);await other.getByRole('heading',{name:'Your Game Day Guide'}).waitFor();
assert.equal(await other.locator('.route-stadium-feature').count(),0);
console.log('Other destinations do not inherit the Texas Tech stadium photo');
await other.close();await b.close();
