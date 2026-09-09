import test from "node:test";
import assert from "node:assert/strict";

import {
  formatGameDate,
  formatRouteDistance,
  formatRouteDuration,
  formatRouteProgress,
  formatTripStats,
} from "../src/lib/formatters.js";

test("route distance and duration retain their current display format", () => {
  assert.equal(formatRouteDistance(1609.344), "1 miles");
  assert.equal(formatRouteDuration(300), "5 min");
  assert.equal(formatRouteDuration(3660), "1 hr 1 min");
});

test("game dates preserve TBD and scheduled kickoff labels", () => {
  assert.equal(formatGameDate(null, false), "Date TBD");
  assert.equal(
    formatGameDate("2026-09-19T12:00:00", true),
    "Sep 19, 2026 · Kickoff TBD"
  );
  assert.equal(
    formatGameDate("2026-09-19T12:00:00", false),
    "Sep 19, 2026 · 12:00 PM"
  );
});

test("trip stats preserve provider and normalize duration", () => {
  assert.equal(formatTripStats(null), null);
  assert.deepEqual(
    formatTripStats({
      distanceMeters: 3218.688,
      durationSeconds: "3660",
      provider: "test-router",
    }),
    {
      distance: "2 miles",
      driveTime: "1 hr 1 min",
      durationSeconds: 3660,
      provider: "test-router",
    }
  );
});

test("route progress labels characterize same-day, day, and hotel output", () => {
  assert.equal(formatRouteProgress(0.25, 1), "Same-day drive · 25%");
  assert.equal(formatRouteProgress(0.25, 4), "Day 2 of 4 · 25% into trip");
  assert.equal(
    formatRouteProgress(0.5, 4, "hotel", 10 * 3600),
    "Night 2 of 3 · about 5 hrs driving · 50% into trip"
  );
});
