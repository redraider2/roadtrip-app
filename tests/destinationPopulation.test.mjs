import test from 'node:test';
import assert from 'node:assert/strict';
import content from '../src/data/destinationPicks.json' with { type: 'json' };
import roster from '../src/data/destinationRoster.json' with { type: 'json' };
import { getDestinationPicks, recommendationFallback } from '../src/lib/destinationPicks.js';

test('all 136 roster markets resolve to reviewed inventory with unique exact home venue mappings', () => {
  assert.equal(content.destinations.length, 136);
  const venues = new Set();
  const entries = new Set();
  for (const market of roster) {
    const d = content.destinations.find(d => d.destinationId === market.destinationId);
    assert.ok(d, market.destinationId);
    assert.equal(d.canonicalTeamId, market.canonicalTeamId);
    assert.equal(d.market, market.market);
    for (const venueId of d.destinationVenueIds) {
      assert.ok(!venues.has(String(venueId)), `Shared venue ${venueId}`);
      venues.add(String(venueId));
      const resolved = getDestinationPicks(venueId);
      assert.equal(resolved.destinationId, d.destinationId);
      const expectedCount = d.destinationId === 'DEST-025' || String(venueId) === '5960' ? 5 : 6;
      assert.equal(resolved.entries.length, expectedCount);
      const advertiser = { id: 'existing-advertiser', businessName: 'Existing advertiser' };
      assert.equal(recommendationFallback(advertiser, venueId), advertiser);
    }
    for (const e of getDestinationPicks(d.destinationVenueIds[0]).entries) {
      assert.ok(!entries.has(e.id)); entries.add(e.id);
      assert.equal(e.verificationStatus, 'source_checked');
      assert.ok(e.sourceCheckedOn);
      assert.ok(['Kickoff Miles Pick', 'Local Resource', 'Official Resource'].includes(e.displayLabel));
      assert.equal(new URL(e.url).protocol, 'https:');
      assert.equal(new URL(e.sourceUrl).protocol, 'https:');
    }
  }
  assert.equal(entries.size, 815);
});

test('Columbia SC and Columbia MO resolve separately, while neutral venues remain excluded', () => {
  assert.equal(getDestinationPicks(3994).state, 'SC');
  assert.equal(getDestinationPicks(3838).state, 'MO');
  for (const venueId of [5348, 3809, 4162, 5376]) assert.equal(getDestinationPicks(venueId), null);
});
