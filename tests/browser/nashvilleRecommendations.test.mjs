import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { nashvilleCategories } from '../../src/lib/nashvilleRecommendations.js';
const baseURL = process.env.NASHVILLE_BASE_URL || 'http://127.0.0.1:5191';
const browser = await chromium.launch({channel:'chrome',headless:true});
test.after(() => browser.close());
await mkdir('outputs/nashville-review',{recursive:true});
async function setup(width, venueId = 3973, advertiser = null, gameDayGuide = null) {
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.addInitScript(()=>localStorage.setItem('roadtrip_auth',JSON.stringify({token:'fixture',user:{email:'review@example.com'}})));
 await context.route('http://localhost:5001/**',async route=>{
  const u=new URL(route.request().url());let data=[];
  if(u.pathname==='/trips') data=[{id:1,title:'Nashville Road Trip',start_location:'Little Rock, AR',end_location:'Nashville, TN',venue_id:venueId}];
  if(u.pathname==='/geocode') data=u.searchParams.get('q')?.includes('Little Rock') ? {latitude:34.746,longitude:-92.29} : {latitude:36.144,longitude:-86.808};
  if(u.pathname==='/route') data={geometry:[[34.746,-92.29],[36.144,-86.808]],distanceMeters:558000,durationSeconds:18720};
  if(u.pathname.endsWith('/places'))data={places:[],venue:{name:'FirstBank Stadium',latitude:36.144,longitude:-86.808,city:'Nashville',state:'TN'}};
  if(u.pathname.endsWith('/featured-partner'))data=advertiser;
  if(u.pathname.endsWith('/game-day-guide'))data=gameDayGuide || {venueName:'FirstBank Stadium',homeTeam:'Vanderbilt'};
  await route.fulfill({json:data});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {context,page,errors};
}
for(const width of [1280,390])test(`Nashville recommendations across journey and public screens at ${width}px`,async()=>{
 const {context,page,errors}=await setup(width);
 try{
  const screens={'trip-hq':'trip_hq','plan-along-the-way':'along_the_way','plan-stay-itinerary':'stay_itinerary','game-weekend':'game_weekend','game-day':'game_day','drive':'drive'};
  for(const [screen,placement] of Object.entries(screens)){
   await page.goto(`${baseURL}/#/${screen}`);
   await page.waitForTimeout(1000);
   const guide=page.locator(`[data-nashville-placement="${placement}"]`);
   await expect(guide).toHaveCount(1);await guide.scrollIntoViewIfNeeded();
   await expect(page.getByRole('heading',{name:'VisitMusicCity.com',exact:true})).toHaveCount(1);
   const feature=page.locator('[data-visit-music-city-feature]');
   await expect(feature).toHaveCount(1);
   await expect(feature.locator('svg')).toHaveCount(1);
   const cta=feature.getByRole('link',{name:'Explore Music City'});
   await cta.focus();assert.notEqual(await cta.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   if(screen==='game-day')await feature.screenshot({path:`outputs/nashville-review/feature-${width}.png`});
   for(const link of await page.getByRole('link',{name:/Explore Music City|Plan your visit at VisitMusicCity/}).all())assert.equal(await link.getAttribute('href'),'https://www.visitmusiccity.com/');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(screen==='game-day') await expect(guide).toContainText('Breakfast at Brown’s Diner');
   if(screen==='game-weekend')for(const category of nashvilleCategories.filter(c=>c.id!=='gameday'))await expect(guide.locator(`[data-nashville-category="${category.id}"]`)).toBeVisible();
   if(['trip-hq','game-day','game-weekend'].includes(screen))await guide.screenshot({path:`outputs/nashville-review/${screen}-${width}.png`});
  }
  await page.goto(`${baseURL}/#/destinations?market=DEST-039`);
  const guide=page.locator('[data-nashville-placement="destination"]');await expect(guide).toHaveCount(1);
  await expect(page.locator('.destination-browser-picks [data-recommendation-id]')).toHaveCount(0);
  await expect(page.getByText('Local recommendations are being prepared for this destination. Check back as coverage grows.')).toHaveCount(0);
  for(const category of nashvilleCategories)for(const item of category.items)await expect(guide.getByText(item,{exact:true})).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await guide.screenshot({path:`outputs/nashville-review/public-${width}.png`});
  await page.getByRole('searchbox').fill('Lubbock');await page.getByRole('navigation',{name:'Destinations'}).getByRole('link').click();
  await expect(page.locator('[data-nashville-placement]')).toHaveCount(0);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
test('Nashville recommendations preserve advertisers and do not appear for other venues',async()=>{
 for(const [venueId,advertiser] of [[3784,null],[3973,{id:123,businessName:'Existing Nashville Advertiser',websiteUrl:'https://example.com',description:'Existing paid placement'}]]){
  const {context,page}=await setup(1280,venueId,advertiser);
  try{await page.goto(`${baseURL}/#/trip-hq`);
   if(venueId===3784)await expect(page.locator('[data-nashville-placement]')).toHaveCount(0);
   else{await expect(page.getByRole('heading',{name:'Existing Nashville Advertiser',exact:true})).toBeVisible();await expect(page.locator('[data-nashville-placement="trip_hq"]')).toHaveCount(1);}
  }finally{await context.close();}
 }
});

for (const width of [1280,390]) test(`Vanderbilt Game Day panels show guidance at ${width}px`, async()=>{
 const row=JSON.parse(await readFile(new URL('../../backend/tailgating_ready_for_qa.json',import.meta.url),'utf8')).find(row=>row.school==='Vanderbilt');
 const guide={school:'Vanderbilt',venueName:'FirstBank Stadium',tailgating:{where:row.where,arrival:row.arrival,rules:row.rules,visitors:row.visitors},parkingArrival:{details:row.parkingArrival},knowBeforeYouGo:{details:row.knowBeforeYouGo},traditions:{details:['Complete',...row.traditions]}};
 const {context,page,errors}=await setup(width,3973,null,guide);
 try {
  await page.goto(`${baseURL}/#/game-day`);
  for(const [label,text] of [['Explore tailgating','Vandyville'],['Explore parking & arrival','digital parking pass'],['Explore stadium information','clear bag'],['Explore traditions','Star Walk']]){
   await page.getByRole('button',{name:new RegExp(label)}).click();
   const panel=page.locator('.tailgating-guide-panel');
   await expect(panel).toContainText(text);
   await expect(panel.getByText('Complete',{exact:true})).toHaveCount(0);
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
