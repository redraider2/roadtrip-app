import test from 'node:test';
import assert from 'node:assert/strict';
import { getNashvilleRecommendations, nashvilleCategories } from '../src/lib/nashvilleRecommendations.js';

test('Nashville guide follows the destination venue, including numeric IDs', () => {
  for (const id of [3973, '3973']) assert.ok(getNashvilleRecommendations(id, 'game_day'));
  for (const id of [null, '', 3784, 3947, 9999]) assert.equal(getNashvilleRecommendations(id, 'game_day'), null);
  assert.equal(getNashvilleRecommendations(3973, 'unknown'), null);
});
test('public destination contains every category and gameday sequence', () => {
  const guide = getNashvilleRecommendations(3973, 'destination');
  assert.equal(guide.categories.length, 10);
  assert.deepEqual(guide.categories, nashvilleCategories);
  assert.deepEqual(getNashvilleRecommendations(3973, 'game_day').categories[0].items, [
    'Breakfast at Brown’s Diner', 'Lunch at Greenery Co. or Red’s Hot Chicken', 'Tailgate at Vandyville', 'Watch the Commodores Win!',
  ]);
});
