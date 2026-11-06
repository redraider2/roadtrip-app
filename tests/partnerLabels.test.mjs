import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerDisclosure, PAID_PARTNER_LABEL} from '../src/lib/partnerLabels.js';
import {getDestinationPicks, getRecommendationPartners} from '../src/lib/destinationPicks.js';
import {getWeekendHotels} from '../src/lib/collegeStationLodging.js';
test('Super Pick recognizes explicit paid partnerships and excludes editorial, demo and house inventory',()=>{
 for(const partner of [{isPaidPartner:true},{partnershipType:'paid'}])assert.equal(partnerDisclosure(partner,'Featured Partner'),PAID_PARTNER_LABEL);
 for(const partner of [{},{partnershipType:'complimentary'},{isPaidPartner:true,isEditorial:true},{isPaidPartner:true,isHouseAd:true},{isPaidPartner:true,isDemo:true}])assert.equal(partnerDisclosure(partner,'Kickoff Miles Pick'),'Kickoff Miles Pick');
});
test('The George is an ordinary hotel option below the paid partner, never an editorial feature',()=>{
 assert.ok(!getDestinationPicks(3795).entries.some(e=>e.title==='The George'));
 for(const context of ['Stay & Itinerary','Route & Schedule','Trip HQ','Game Weekend'])assert.ok(!getRecommendationPartners(3795,[],context).some(e=>e.businessName==='The George'));
 const george={name:'The George',website:'https://www.thegeorgetexas.com/'};
 const hotels=getWeekendHotels([george],3795);
 assert.equal(hotels[0].sponsorshipLabel,PAID_PARTNER_LABEL);
 assert.equal(hotels[1],george);
});
