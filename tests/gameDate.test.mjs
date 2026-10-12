import test from "node:test";
import assert from "node:assert/strict";
import { formatGameDate, formatGameCalendarDate } from "../src/lib/formatters.js";

test("TBD dates retain the published day across viewer timezones", () => {
  const prior = process.env.TZ;
  try {
    for (const zone of ["America/Chicago", "America/Los_Angeles", "Pacific/Honolulu", "Pacific/Auckland"]) {
      process.env.TZ = zone;
      assert.equal(formatGameDate("2026-10-24T04:00:00.000Z", true), "Oct 24, 2026 · Kickoff TBD");
      assert.equal(formatGameCalendarDate("2026-10-24T04:00:00.000Z", true), "Oct 24");
      assert.equal(formatGameDate("2026-11-07T05:00:00.000Z", true), "Nov 7, 2026 · Kickoff TBD");
    }
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
});

test("announced kickoffs still display their real viewer-local date and time", () => {
  const prior = process.env.TZ;
  try {
    process.env.TZ = "America/Chicago";
    assert.equal(formatGameDate("2026-10-24T01:00:00.000Z", false), "Oct 23, 2026 · 8:00 PM");
    assert.equal(formatGameCalendarDate("2026-10-24T01:00:00.000Z", false), "Oct 23");
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
});

test("missing or invalid kickoff values avoid invalid date text", () => {
  for (const value of [null, undefined, "", "not-a-date"]) {
    assert.equal(formatGameDate(value, true), "Date TBD");
    assert.equal(formatGameDate(value, false), "Date TBD");
  }
});
