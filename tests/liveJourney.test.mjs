import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveJourney, prepareRoute, locateOnRoute, recommendAhead, upcomingGeometry, watchJourneyLocation } from "../src/lib/liveJourney.js";

const route = prepareRoute([[30, -100], [30, -99], [30, -98]]);
const now = Date.parse("2026-09-11T17:00:00Z");
const fix = { latitude: 30, longitude: -99, accuracy: 20, timestamp: now };

test("route projection interpolates between vertices and computes remaining time", () => {
  const state = buildLiveJourney({ ...fix, longitude: -99.5 }, route, 7200, now);
  assert.ok(Math.abs(state.progress - .25) < .001);
  assert.ok(Math.abs(state.remainingSeconds - 5400) < 1);
  assert.ok(Math.abs(state.eta - (now + 5400000)) < 1000);
  assert.equal(state.phase, "en_route");
});

test("route endpoints clamp progress and near-destination phases require proximity", () => {
  assert.equal(buildLiveJourney({ ...fix, longitude: -100 }, route, 7200, now).phase, "departing");
  assert.equal(buildLiveJourney({ ...fix, longitude: -98.2 }, route, 7200, now).phase, "approaching_destination");
  assert.equal(buildLiveJourney({ ...fix, longitude: -98 }, route, 7200, now).phase, "arrived");
  const offRoute = buildLiveJourney({ ...fix, latitude: 31, longitude: -98 }, route, 7200, now);
  assert.equal(offRoute.phase, "off_route");
  assert.equal(offRoute.eta, null);
  assert.deepEqual(recommendAhead([], route, offRoute, 12), []);
});

test("stale, future, imprecise and invalid locations do not invent live state", () => {
  for (const invalid of [
    { ...fix, timestamp: now - 61000 }, { ...fix, timestamp: now + 11000 },
    { ...fix, accuracy: 501 }, { ...fix, accuracy: -1 },
    { ...fix, latitude: null }, { ...fix, longitude: 181 }, { ...fix, timestamp: NaN },
  ]) assert.equal(buildLiveJourney(invalid, route, 7200, now), null);
  assert.equal(prepareRoute([[30, -100]]), null);
  assert.equal(prepareRoute([[30, -100], [30, -100]]), null);
  assert.equal(prepareRoute([[30, -100], [null, -99]]), null);
  assert.equal(locateOnRoute([30, -99], null), null);
  assert.equal(buildLiveJourney(fix, route, undefined, now).eta, null);
});

test("duplicate geometry vertices do not cause NaN progress", () => {
  const repeated = prepareRoute([[30, -100], [30, -100], [30, -98]]);
  assert.ok(Math.abs(locateOnRoute([30, -99], repeated).progress - .5) < .001);
});

test("recommendations exclude passed, distant and invalid places and prioritize meals", () => {
  const journey = buildLiveJourney(fix, route, 7200, now);
  const place = (id, longitude, category = "historic", latitude = 30) => ({ id, name: id, category, longitude, latitude });
  const places = [place("behind", -99.1), place("history", -98.9), place("meal", -98.8, "restaurant"),
    place("meal", -98.8, "restaurant"), place("too far", -97), place("off route", -98.8, "restaurant", 31),
    { id: "missing", latitude: null, longitude: null }];
  assert.deepEqual(recommendAhead(places, route, journey, 12).map(p => p.id), ["meal", "history"]);
  assert.deepEqual(recommendAhead(places, route, journey, 15).map(p => p.id), ["history", "meal"]);
  assert.deepEqual(recommendAhead(places, route, null, 12), []);
  const corridor = upcomingGeometry(route, journey, 60);
  assert.deepEqual(corridor[0], [30, -99]);
  assert.deepEqual(corridor.at(-1), [30, -98]);
});

test("location subscription clears its watch and ignores callbacks after stop", () => {
  let success;
  let failure;
  let clearId;
  const fixes = [];
  const errors = [];
  const stop = watchJourneyLocation({
    watchPosition(onSuccess, onFailure, options) {
      success = onSuccess; failure = onFailure;
      assert.equal(options.enableHighAccuracy, true);
      return 42;
    },
    clearWatch(id) { clearId = id; },
  }, value => fixes.push(value), error => errors.push(error));
  success({ coords: { latitude: 30, longitude: -99, accuracy: 10 }, timestamp: now });
  assert.equal(fixes.length, 1);
  failure({ code: 1 });
  assert.match(errors[0], /declined/);
  stop();
  assert.equal(clearId, 42);
  success({ coords: {}, timestamp: now });
  failure({ code: 3 });
  assert.equal(fixes.length, 1);
  assert.equal(errors.length, 1);
});

test("unsupported location and synchronous browser errors are explained", () => {
  let message;
  watchJourneyLocation(null, () => {}, value => { message = value; })();
  assert.match(message, /isn’t available/);
  watchJourneyLocation({ watchPosition() { throw new Error("insecure"); } }, () => {}, value => { message = value; })();
  assert.match(message, /unavailable/);
});
