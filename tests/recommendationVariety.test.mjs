import test from 'node:test';
import assert from 'node:assert/strict';
import content from '../src/data/destinationPicks.json' with {type:'json'};
import {getRecommendationPartners, recommendationFallback} from '../src/lib/destinationPicks.js';
import {culinaryGangsterTempe} from '../src/lib/destinationArtworkCampaigns.js';
import {destinationPartners} from '../src/lib/destinationPartners.js';
import {getNashvilleRecommendations, visitMusicCity} from '../src/lib/nashvilleRecommendations.js';
const pages=['Trip HQ','Route & Schedule','Along the Way','Stay & Itinerary','Game Weekend','Game Day','Drive'];

test('each destination uses a stable, page-specific subset of eligible entries',()=>{
 for(const destination of content.destinations){
  const venue=destination.destinationVenueIds[0];
  if(getNashvilleRecommendations(venue,"destination")) continue;
  const eligible=new Set(getRecommendationPartners(venue).map(p=>p.id));
  for(const page of pages){
   const picks=getRecommendationPartners(venue,[],page);
   assert.ok(picks.length,`${destination.teamName}: no picks for ${page}`);
   assert.deepEqual(picks,getRecommendationPartners(venue,[],page));
   assert.equal(new Set(picks.map(p=>p.id)).size,picks.length);
   assert.ok(picks.every(p=>eligible.has(p.id)));
   const omitted=picks[0].businessName;
   assert.ok(getRecommendationPartners(venue,[omitted],page).every(p=>p.businessName!==omitted));
  }
 }
});

test('Lubbock pages no longer repeat the same complete list',()=>{
 const primary=page=>getRecommendationPartners(3784,[],page)[0].businessName;
 assert.equal(primary('Trip HQ'),'Buddy Holly Hall');
 assert.equal(primary('Route & Schedule'),'Overton Hotel & Conference Center');
 assert.equal(primary('Stay & Itinerary'),'Overton Hotel & Conference Center');
 assert.equal(primary('Along the Way'),'Visit Lubbock');
 assert.equal(primary('Game Weekend'),'Caprock Cafe');
 assert.equal(primary('Game Day'),'Texas Tech football game-day guide');
 assert.ok(!getRecommendationPartners(3784,[],'Game Day').some(p=>p.businessName==='American Windmill Museum'));
});

test('paying and complimentary placements take precedence on every page',()=>{
 for(const page of pages){
  for(const partner of [culinaryGangsterTempe,destinationPartners[0],visitMusicCity]){
   assert.equal(recommendationFallback(partner,partner.destinationVenueIds[0],0,page),partner);
  }
 }
});

test('Nashville supplied program retains its full order on every page',()=>{
 const original=getRecommendationPartners(3973);
 assert.deepEqual(original,[]);
 assert.ok(getNashvilleRecommendations(3973,'destination'));
 for(const page of pages) assert.deepEqual(getRecommendationPartners(3973,[],page),original);
});
