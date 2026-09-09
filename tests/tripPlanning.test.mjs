import test from "node:test";
import assert from "node:assert/strict";

import {
  comparePlaceQuality,
  getOvernightTargets,
  getTravelDayNumber,
  isValidCoordinate,
  normalizePlaceName,
  orderHotelsByTravelNight,
  orderPlacesByTravelDay,
} from "../src/lib/tripPlanning.js";

test("coordinates accept numeric strings and reject zero or invalid values", () => {
  assert.equal(isValidCoordinate({ latitude: "35.2", longitude: "-97.4" }), true);
  assert.equal(isValidCoordinate({ latitude: 0, longitude: -97.4 }), false);
  assert.equal(isValidCoordinate({ latitude: "unknown", longitude: -97.4 }), false);
});

test("place names normalize punctuation, apostrophes, case, and whitespace", () => {
  assert.equal(normalizePlaceName("  Joe’s Bar & Grill!  "), "joes bar grill");
  assert.equal(normalizePlaceName(null), "null");
});

test("travel-day assignment clamps progress and day count", () => {
  assert.equal(getTravelDayNumber(-1, 4), 1);
  assert.equal(getTravelDayNumber(0.25, 4), 2);
  assert.equal(getTravelDayNumber(1, 4), 4);
  assert.equal(getTravelDayNumber(0.8, 0), 1);
});

test("place quality prioritizes rating, then rating count", () => {
  assert.ok(comparePlaceQuality({ rating: 4.2 }, { rating: 4.8 }) > 0);
  assert.ok(
    comparePlaceQuality(
      { rating: 4.5, ratingCount: 100 },
      { rating: 4.5, ratingCount: 300 }
    ) > 0
  );
});

test("places prioritize one recommendation per travel-day stretch", () => {
  const places = [
    { id: "late", routeProgress: 0.8, rating: 5 },
    { id: "day-one-far", routeProgress: 0.05, rating: 5 },
    { id: "day-one-near", routeProgress: 0.2, rating: 4 },
    { id: "middle", routeProgress: 0.55, rating: 4.5 },
  ];

  assert.deepEqual(
    orderPlacesByTravelDay(places, 2).map((place) => place.id),
    ["day-one-near", "late", "day-one-far", "middle"]
  );
});

test("hotels prioritize overnight targets and keep the input immutable", () => {
  const hotels = [
    { id: "destination", routeProgress: 0.95, rating: 5 },
    { id: "night-two", routeProgress: 0.67, rating: 4 },
    { id: "night-one", routeProgress: 0.34, rating: 4 },
  ];
  const original = [...hotels];

  assert.deepEqual(
    orderHotelsByTravelNight(hotels, 3).map((place) => place.id),
    ["night-one", "night-two", "destination"]
  );
  assert.deepEqual(hotels, original);
});

test("same-day hotels fall back to quality ordering", () => {
  const hotels = [
    { id: "a", rating: 4.2, ratingCount: 500 },
    { id: "b", rating: 4.8, ratingCount: 10 },
  ];
  assert.deepEqual(
    orderHotelsByTravelNight(hotels, 1).map((place) => place.id),
    ["b", "a"]
  );
});

test("overnight targets preserve the 15 percent planning tolerance", () => {
  assert.deepEqual(getOvernightTargets(9 * 3600, "8"), []);
  assert.deepEqual(getOvernightTargets(10 * 3600, "8"), [0.5]);
  assert.deepEqual(getOvernightTargets(20 * 3600, "8"), [1 / 3, 2 / 3]);
  assert.deepEqual(getOvernightTargets(20 * 3600, "straight"), []);
});

test("ordering helpers return an empty list for missing place data", () => {
  assert.deepEqual(orderPlacesByTravelDay(null, 2), []);
  assert.deepEqual(orderHotelsByTravelNight([], 2), []);
});
