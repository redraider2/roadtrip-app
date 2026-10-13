import test from 'node:test';
import assert from 'node:assert/strict';
import { guideLines, normalizeGameDayGuide } from '../src/lib/gameDayGuide.js';
test('spreadsheet status values never become visitor guide content', () => {
  assert.deepEqual(guideLines([' Complete ', 'Ready for QA', '', null, 'Use Gate 2.']), ['Use Gate 2.']);
  const data = normalizeGameDayGuide({tailgating:{where:['Complete'], arrival:'Arrive early.\nComplete'}, parkingArrival:{details:['Complete','Complete'],sourceUrl:'https://example.com'}});
  assert.deepEqual(data.tailgating.where, []);
  assert.deepEqual(data.tailgating.arrival, ['Arrive early.']);
  assert.deepEqual(data.parkingArrival.details, []);
  assert.equal(data.parkingArrival.sourceUrl, 'https://example.com');
  assert.equal(normalizeGameDayGuide(null), null);
});
