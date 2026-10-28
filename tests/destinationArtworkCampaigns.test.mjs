import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { culinaryGangsterTempe, selectDestinationArtwork } from '../src/lib/destinationArtworkCampaigns.js';
import { recordPartnerEvent, getPartnerEvents } from '../src/lib/partnerMetrics.js';

// Test-only configuration; these are not agreed production placements or URLs.
const fixture = {
  ...culinaryGangsterTempe,
  placements: { fixture_slot: 'burger_fries' },
  links: { view_menu: 'https://example.org/approved-menu' },
};

test('exactly four approved locations use four distinct creatives and approved links', () => {
  assert.deepEqual(culinaryGangsterTempe.placements, {
    trip_hq: 'burger_fries', along_the_way: 'chicken_avocado_bowl', game_weekend: 'street_gyros', game_day: 'hot_honey_chicken',
  });
  for (const slot of Object.keys(culinaryGangsterTempe.placements)) {
    const selected = selectDestinationArtwork(culinaryGangsterTempe, '3947', slot);
    assert.ok(selected);
    if (selected.creative.action === 'view_menu') assert.equal(selected.href, 'https://culinarygangsterusa.com/menu/tempe');
    else assert.equal(new URL(selected.href).searchParams.get('destination'), '501 S Mill Ave #200, Tempe, AZ');
  }
  for (const slot of ['home', 'stay_itinerary', undefined]) assert.equal(selectDestinationArtwork(culinaryGangsterTempe, 3947, slot), null);
});

test('artwork selection requires the exact destination ID and configured placement', () => {
  assert.equal(selectDestinationArtwork(fixture, 3947, 'fixture_slot').creativeId, 'burger_fries');
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
    assert.equal(selectDestinationArtwork({ ...fixture, links: { view_menu: href } }, 3947, 'fixture_slot'), null);
  }
});

test('all four approved PNGs match their source files and configured dimensions', async () => {
  const hashes = {
    "burger_fries": "356cca22e05a0b5d4755f0e03529b268596c4c58e346d8ba8f2a0bd75b4a5a31",
    "hot_honey_chicken": "4915cc7c4f26c866534670671a3821390ed89a60c3a61cd370da96460d2a6dcd",
    "street_gyros": "4ef79185ccf51187437e659a72c9dd72d8def13b7d77a170a18491633955174a",
    "chicken_avocado_bowl": "288f5fe275615912d43b91364969d5f00925b2664a0646384648cd824e658104"
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
