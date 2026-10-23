import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import destinations from '../src/data/destinationPicks.json' with {type:'json'};
import profiles from '../src/data/stadiumProfiles.json' with {type:'json'};
import {getStadiumProfile,stadiumFeatureCopy} from '../src/lib/stadiumProfiles.js';

test('all 136 destinations resolve to a saved, credited stadium asset',async()=>{
 assert.equal(Object.keys(profiles).length,136);
 for(const destination of destinations.destinations){
  const p=getStadiumProfile(destination.destinationVenueIds[0]);
  assert.ok(p,`${destination.teamName} photo missing`);
  assert.equal(p.destinationId,destination.destinationId);
  assert.equal(p.school,destination.teamName);
  const file=await stat(new URL(`../public/${p.photo.path}`,import.meta.url));
  assert.ok(file.size>1000);
  assert.ok(p.photo.width>0&&p.photo.height>0);
  assert.ok(p.photo.creator&&p.photo.creditText&&p.photo.changes);
  assert.equal(new URL(p.photo.sourceUrl).protocol,'https:');
  if(p.photo.licenseUrl)assert.equal(new URL(p.photo.licenseUrl).protocol,'https:');
  else assert.equal(p.photo.license,'Public domain');
 }
});

test('venue matching uses exact normalized IDs and distinguishes Northwestern stadiums',()=>{
 assert.equal(getStadiumProfile('3784.0'),getStadiumProfile(3784));
 assert.equal(getStadiumProfile(' 3973 ' ).school,'Vanderbilt');
 assert.equal(getStadiumProfile(11823).stadium,'Ryan Field');
 for(const id of [5960,9999,null,undefined,'','Northwestern','Texas Tech'])assert.equal(getStadiumProfile(id),null);
});

test('photo selection and captions retain Lubbock and each destination identity',async()=>{
 const lubbock=getStadiumProfile(3784);
 assert.equal(lubbock.photo.path,'stadiums/texas-tech-preview.jpg');
 assert.equal(lubbock.photo.license,'CC BY 2.0');
 assert.match(stadiumFeatureCopy(lubbock,'weekend').title,/Raiderland/);
 for(const p of Object.values(profiles))for(const variant of ['plan','weekend','day']){
  const copy=stadiumFeatureCopy(p,variant);
  assert.ok(copy.eyebrow.includes(p.school));
  assert.ok(copy.eyebrow.includes(p.city));
  if(p.venueId!=='3784')assert.doesNotMatch(copy.title,/Raiderland/);
 }
 // The approved home background remains a separate asset, never a destination's photograph.
 const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
 assert.match(app,/<Background team=\{activeScreen === "home" \? null : backgroundTeam\}/);
});
