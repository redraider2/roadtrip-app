import { chromium } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('docs/hotel-creative-20261106');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:1});
const keys=['trip-hq','along-the-way','game-weekend','game-day'];
const expected='Stay at the only hotel on the Texas A&M campus, just steps from Kyle Field. Enjoy upscale accommodations, convenient on-site parking, and the option to enhance your stay with a Gameday Hullabaloo Experience pass featuring unlimited game day dining, live music, and more.';
const metadata=[];
for(const [i,key] of keys.entries()){
 await page.goto('file://'+root+'/index.html?view='+key+'&shot=1');
 await page.locator('.surface.active .sponsor img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 const card=page.locator('.surface.active .sponsor');
 const text=await card.locator('.copy').innerText();
 if(text!==expected)throw Error('Copy mismatch: '+key);
 if(await card.locator('.photo-caption').count())throw Error('Old photo tag');
 const filename=`texas-am-hotel-0${i+1}-${key}-20261106.png`;
 await card.screenshot({path:'public/partners/'+filename});
 const png=await readFile('public/partners/'+filename);
 metadata.push({key,filename,width:png.readUInt32BE(16),height:png.readUInt32BE(20)});
}
await writeFile('outputs/hotel-release-20261106/cards.json',JSON.stringify(metadata,null,2));
console.log(JSON.stringify(metadata));
await browser.close();
