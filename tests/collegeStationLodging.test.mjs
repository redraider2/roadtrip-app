import test from 'node:test';
import assert from 'node:assert/strict';
import { filterHotelCards, getWeekendHotels, SPONSORED_HOTEL_LABEL } from '../src/lib/collegeStationLodging.js';

const hotel = (id, name = id) => ({id, name, website:'https://example.com'});
test('Kyle Field has a disclosed sponsor first and only two alternatives, regardless of expanded view', () => {
  const original = ['one','two','three','four'].map(id => hotel(id));
  const result = getWeekendHotels(original, 3795);
  assert.equal(result.length, 3);
  assert.equal(result[0].sponsorshipLabel, SPONSORED_HOTEL_LABEL);
  assert.equal(result[0].website, 'https://www.texasamhotelcc.com/');
  assert.deepEqual(result.slice(1), original.slice(0,2));
  assert.equal(original.length, 4);
});
test('deduplicates sponsor aliases and retains real API coordinates/rating', () => {
  const sponsor = {...hotel('sponsor','Texas A and M'), website:'https://www.texasamhotelcc.com/rooms', latitude:30.6, longitude:-96.3, rating:4.7};
  const result = getWeekendHotels([hotel('one'), sponsor, hotel('duplicate','Texas A&M Hotel and Conference Center'), hotel('two')], '3795');
  assert.equal(result.length,3);
  assert.equal(result[0].id,'sponsor');
  assert.equal(result[0].latitude,30.6);
  assert.equal(result[0].rating,4.7);
  assert.deepEqual(result.slice(1).map(p => p.id), ['one','two']);
});
test('empty hotel response still provides official sponsored booking without fabricated coordinates/ratings', () => {
  const [sponsor] = getWeekendHotels([], '3795');
  assert.equal(sponsor.latitude, undefined);
  assert.equal(sponsor.rating, undefined);
  assert.equal(sponsor.sponsorshipLabel, SPONSORED_HOTEL_LABEL);
});
test('other destinations and missing venue preserve original recommendations', () => {
  const hotels = [hotel('one')];
  for (const venue of ['3784','3947',null,'37950']) assert.equal(getWeekendHotels(hotels,venue), hotels);
});
test('suppresses only lodging cards on the four promised pages in Kyle Field', () => {
  const cards = [{category:'lodging'},{category:'hotel'},{category:'food'},{category:'things to do'}];
  for (const page of ['Trip HQ','Along the Way','Game Weekend','Game Day']) {
    assert.deepEqual(filterHotelCards(cards,'3795',page),cards.slice(2));
    assert.equal(filterHotelCards(cards,'3784',page),cards);
  }
  assert.equal(filterHotelCards(cards,'3795','Stay & Itinerary'),cards);
});
