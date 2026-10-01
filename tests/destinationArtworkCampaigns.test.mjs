import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { culinaryGangsterTempe, selectDestinationArtwork } from '../src/lib/destinationArtworkCampaigns.js';
import { recordPartnerEvent, getPartnerEvents } from '../src/lib/partnerMetrics.js';

// Test-only configuration; these are not agreed production placements or URLs.
const fixture = {
  ...culinaryGangsterTempe,
  placements: { fixture_slot: 'directions' },
  links: { directions: 'https://example.org/approved-directions' },
};

test('exactly four approved locations use all three creatives and approved links', () => {
  assert.deepEqual(culinaryGangsterTempe.placements, {
    trip_hq: 'directions', along_the_way: 'game_day', game_weekend: 'menu', game_day: 'game_day',
  });
  for (const slot of Object.keys(culinaryGangsterTempe.placements)) {
    const selected = selectDestinationArtwork(culinaryGangsterTempe, '3947', slot);
    assert.ok(selected);
    if (selected.creative.action === 'view_menu') assert.equal(selected.href, 'https://culinarygangsterusa.com/menu/tempe');
    else assert.equal(new URL(selected.href).searchParams.get('destination'), '501 S Mill Avenue, Tempe, AZ');
  }
  for (const slot of ['home', 'stay_itinerary', undefined]) assert.equal(selectDestinationArtwork(culinaryGangsterTempe, 3947, slot), null);
});

test('artwork selection requires the exact destination ID and configured placement', () => {
  assert.equal(selectDestinationArtwork(fixture, 3947, 'fixture_slot').creativeId, 'directions');
  for (const venue of [null, undefined, '', 'tempe', '13947', '3947-other', '3784']) {
    assert.equal(selectDestinationArtwork(fixture, venue, 'fixture_slot'), null);
  }
  assert.equal(selectDestinationArtwork(fixture, '3947', 'global'), null);
});

test('selection responds to Tempe -> another destination -> Tempe without sticky state', () => {
  assert.deepEqual(['3947', '3784', '3947'].map(id => Boolean(selectDestinationArtwork(fixture, id, 'fixture_slot'))), [true, false, true]);
});

test('missing, placeholder and executable targets render no link', () => {
  for (const href of ['', '#', undefined, 'javascript:alert(1)', '/menu']) {
    assert.equal(selectDestinationArtwork({ ...fixture, links: { directions: href } }, 3947, 'fixture_slot'), null);
  }
});

test('all three original PNGs are byte-preserved with their original dimensions', async () => {
  const hashes = {
    directions: 'b6320cef14d6bc6abefa4229c8856f9e3f2d874792597cc7f557fb03b5a73a9b',
    game_day: '44594fc1ac344fb0368427f64de8d85ba39810b62e71eb34d4a987a6a152798b',
    menu: '04de3a7b111e2d157708e05f0b795806400324acda2eeb254fab60a37d6f72dc',
  };
  for (const [id, creative] of Object.entries(culinaryGangsterTempe.creatives)) {
    const bytes = await readFile(new URL(`../public/${creative.imageUrl}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[id]);
    assert.equal(bytes.readUInt32BE(16), creative.width);
    assert.equal(bytes.readUInt32BE(20), creative.height);
  }
});

test('campaign dimensions reuse the existing partner event store', () => {
  let stored;
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } };
  try {
    recordPartnerEvent({ partner: fixture, campaignId: fixture.id, destinationId: '3947', placement: 'fixture_slot', creative: 'directions', action: 'impression' });
    const [event] = getPartnerEvents();
    assert.equal(event.campaign_id, 'culinary_gangster_tempe');
    assert.equal(event.destination_id, '3947');
    assert.equal(event.placement, 'fixture_slot');
    assert.equal(event.creative, 'directions');
  } finally { delete globalThis.window; }
});
