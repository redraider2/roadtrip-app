import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationPartners, getDestinationPartners, partnerDirectionsUrl, isDestinationPartnerSaved } from '../src/lib/destinationPartners.js';
import { recordPartnerEvent, getPartnerEvents } from '../src/lib/partnerMetrics.js';
const partner = destinationPartners[0];
test('Cactus is restricted to Texas Tech destination and the three approved placements', () => {
  for (const placement of ['trip_hq', 'stay_itinerary', 'game_weekend']) {
    assert.deepEqual(getDestinationPartners(3784, placement), [partner]);
    for (const venue of [null, '', 9999]) assert.deepEqual(getDestinationPartners(venue, placement), []);
  }
  assert.deepEqual(getDestinationPartners(3784, 'game_day'), []);
  assert.equal(partner.placements.trip_hq.creative, 'small');
  assert.equal(partner.placements.stay_itinerary.creative, 'small');
  assert.equal(partner.placements.game_weekend.creative, 'featured');
});
test('directions use the full address and saved detection uses existing stops', () => {
  assert.equal(new URL(partnerDirectionsUrl(partner)).searchParams.get('destination'), partner.address);
  assert.equal(isDestinationPartnerSaved(partner, [{ name: partner.name, notes: partner.address }]), true);
  assert.equal(isDestinationPartnerSaved(partner, [{ name: partner.name, notes: 'Elsewhere' }]), false);
});
test('tracking retains existing metrics and exposes all pilot dimensions', () => {
  let storage;
  globalThis.window = { localStorage: { getItem: () => storage, setItem: (_, v) => { storage = v; } } };
  for (const action of ['impression', 'view_events', 'directions', 'save_to_trip']) recordPartnerEvent({ partner, placement: 'game_weekend', creative: 'featured', action });
  const events = getPartnerEvents();
  assert.equal(events.length, 4);
  for (const event of events) {
    assert.equal(event.partner_id, 'cactus_theater'); assert.equal(event.market, 'lubbock');
    assert.equal(event.placement, 'game_weekend'); assert.equal(event.creative, 'featured');
    assert.equal(event.eventType, event.action);
  }
  delete globalThis.window;
});
