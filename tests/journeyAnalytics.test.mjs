import assert from "node:assert/strict";
import test from "node:test";
import { createJourneyAnalytics } from "../src/lib/journeyAnalytics.js";
const team = { id: 2, school: "Auburn" };
const game = { id: 101, awayTeam: "Auburn", homeTeam: "Alabama", venueId: 3657 };
const route = { geometry: [[41.8, -87.6], [33.2, -87.5]], distanceMeters: 1155509, durationSeconds: 38580 };
const fixture = () => { const events = []; return { events, tracker: createJourneyAnalytics((event, properties) => events.push({ event, properties })) }; };

test("selection outcomes reject invalid input and deduplicate repeat selection while allowing changed choices", () => {
  const { tracker, events } = fixture();
  tracker.teamSelected(null, 2026); tracker.gameSelected({}, 2026);
  tracker.teamSelected(team, 2026); tracker.teamSelected(team, 2026);
  tracker.gameSelected(game, 2026); tracker.gameSelected(game, 2026);
  assert.deepEqual(events.map((e) => e.event), ["team_selected", "away_game_selected"]);
  tracker.teamSelected({ id: 3, school: "TCU" }, 2026);
  tracker.gameSelected({ ...game, id: 102, awayTeam: "TCU" }, 2026);
  tracker.resetSelection(); tracker.teamSelected(team, 2026);
  assert.equal(events.length, 5);
});

test("route_created requires a matching new-trip intent and a successful valid route, and fires once", () => {
  const { tracker, events } = fixture();
  tracker.routeCreated({ id: 1 }, route, 0); // Loading/reopening a saved trip.
  assert.equal(events.length, 0);
  tracker.beginRoute({ id: 1 }, "football");
  tracker.routeCreated({ id: 2 }, route, 0); // Stale asynchronous response.
  tracker.routeCreated({ id: 1 }, { ...route, geometry: [] }, 0);
  tracker.routeCreated({ id: 1 }, { ...route, distanceMeters: NaN }, 0);
  assert.equal(events.length, 0);
  tracker.routeCreated({ id: 1 }, route, 0);
  tracker.routeCreated({ id: 1 }, route, 0); // StrictMode/stop re-fetch/recalculation.
  assert.deepEqual(events, [{ event: "route_created", properties: { trip_type: "football", planning_mode: "saved", distance_miles: 718, drive_minutes: 643, route_stop_count: 0 } }]);
  tracker.beginRoute({ id: null }, "football"); tracker.routeCreated({ id: null }, route, 0);
  assert.equal(events[1].properties.planning_mode, "preview");
  tracker.beginRoute({ id: 3 }, "custom"); tracker.resetSelection(); tracker.routeCreated({ id: 3 }, route, 0);
  assert.equal(events.length, 2);
});

test("trip_saved requires a real persisted ID, never a preview, and deduplicates repeated acknowledgements", () => {
  const { tracker, events } = fixture();
  for (const id of [null, undefined, 0, -1, "invalid"]) tracker.tripSaved({ id }, "football", 3657);
  assert.equal(events.length, 0);
  tracker.tripSaved({ id: 1 }, "football", 3657); tracker.tripSaved({ id: "1" }, "football", 3657);
  tracker.tripSaved({ id: 2 }, "custom");
  assert.deepEqual(events, [
    { event: "trip_saved", properties: { trip_type: "football", venue_id: "3657", persistence: "server" } },
    { event: "trip_saved", properties: { trip_type: "custom", persistence: "server" } },
  ]);
});

test("properties exclude private trip data and blocked analytics cannot break outcomes", () => {
  const { tracker, events } = fixture();
  const privateTrip = { id: 1, title: "Personal vacation", notes: "private notes", start: "123 Private Home Street", email: "person@example.com", token: "secret", latitude: 41.8 };
  tracker.tripSaved(privateTrip, "football", 3657); tracker.beginRoute(privateTrip, "football"); tracker.routeCreated(privateTrip, route, 0);
  const payload = JSON.stringify(events);
  for (const value of ["Personal", "private", "Home Street", "person@example.com", "secret", "latitude", "longitude", "geometry", "start", "trip_id"]) assert.ok(!payload.includes(value), value);
  const blocked = createJourneyAnalytics(() => { throw new Error("Blocked analytics"); });
  assert.doesNotThrow(() => { blocked.teamSelected(team, 2026); blocked.gameSelected(game, 2026); blocked.tripSaved(privateTrip, "football"); blocked.beginRoute(privateTrip, "football"); blocked.routeCreated(privateTrip, route, 0); });
});
