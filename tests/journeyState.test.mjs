import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildJourneyState,
  determineJourneyPhase,
  locateAlongRoute,
} = require("../backend/src/journeyState.js");

const geometry = [
  [29.7604, -95.3698],
  [30.2672, -97.7431],
  [31.5493, -97.1467],
  [32.4487, -99.7331],
  [33.5779, -101.8552],
];

test("locates a traveler near the middle of a route", () => {
  const result = locateAlongRoute(
    { latitude: 31.5493, longitude: -97.1467 },
    geometry
  );

  assert.ok(result.routeProgressPercent > 25);
  assert.ok(result.routeProgressPercent < 75);
  assert.ok(result.remainingMeters > 0);
  assert.ok(result.traveledMeters > 0);
  assert.ok(result.offRouteMeters < 1000);
});

test("journey state produces progress, remaining distance, ETA, and phase", () => {
  const now = new Date("2026-09-17T18:00:00.000Z");
  const state = buildJourneyState({
    currentPosition: { latitude: 32.4487, longitude: -99.7331 },
    geometry,
    routeDurationSeconds: 28800,
    destination: { latitude: 33.5779, longitude: -101.8552 },
    now,
  });

  assert.ok(state.routeProgressPercent > 50);
  assert.ok(state.routeProgressPercent < 100);
  assert.ok(state.distanceRemainingMiles > 0);
  assert.ok(state.durationRemainingSeconds > 0);
  assert.ok(new Date(state.estimatedArrivalUtc) > now);
  assert.ok(["en_route", "approaching_destination"].includes(state.journeyPhase));
});

test("phase progression distinguishes pre-trip, departure, approach, arrival and completion", () => {
  assert.equal(
    determineJourneyPhase({
      progressPercent: 0,
      distanceRemainingMiles: 500,
      distanceToDestinationMiles: 500,
      tripStarted: false,
    }),
    "pre_trip"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 1,
      distanceRemainingMiles: 490,
      distanceToDestinationMiles: 490,
    }),
    "departing"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 50,
      distanceRemainingMiles: 250,
      distanceToDestinationMiles: 250,
    }),
    "en_route"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 95,
      distanceRemainingMiles: 12,
      distanceToDestinationMiles: 12,
      arrivalRadiusMiles: 15,
    }),
    "approaching_destination"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 99,
      distanceRemainingMiles: 1,
      distanceToDestinationMiles: 1,
      arrivalRadiusMiles: 15,
    }),
    "arrived"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 100,
      distanceRemainingMiles: 0,
      distanceToDestinationMiles: 0,
      tripCompleted: true,
    }),
    "complete"
  );
});

test("game weekend and return trip override ordinary phase selection", () => {
  assert.equal(
    determineJourneyPhase({
      progressPercent: 100,
      distanceRemainingMiles: 0,
      distanceToDestinationMiles: 0,
      gameWeekend: true,
      arrivalRadiusMiles: 15,
    }),
    "game_weekend"
  );

  assert.equal(
    determineJourneyPhase({
      progressPercent: 20,
      distanceRemainingMiles: 400,
      distanceToDestinationMiles: 400,
      returnTrip: true,
    }),
    "return_trip"
  );
});

test("invalid route geometry fails instead of inventing progress", () => {
  assert.throws(
    () =>
      locateAlongRoute(
        { latitude: 31, longitude: -99 },
        [[31, -99]]
      ),
    /at least two valid points/
  );
});
