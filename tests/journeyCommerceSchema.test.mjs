import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL(
    "../backend/migrations/20260910_add_journey_commerce_foundation.sql",
    import.meta.url
  ),
  "utf8"
);

const tables = [
  "destinations",
  "journey_states",
  "businesses",
  "business_locations",
  "campaigns",
  "campaign_targets",
  "placements",
  "campaign_placements",
  "interaction_events",
];

test("journey commerce migration is transactional and avoids psql meta commands", () => {
  assert.match(migration, /^BEGIN;/m);
  assert.match(migration, /COMMIT;\s*$/m);
  assert.doesNotMatch(migration, /^\\/m);
});

test("journey commerce foundation creates all required tables idempotently", () => {
  for (const table of tables) {
    assert.match(
      migration,
      new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table}\\s*\\(`, "i"),
      `${table} must be created idempotently`
    );
  }
});

test("journey state supports the full trip lifecycle", () => {
  for (const phase of [
    "pre_trip",
    "departing",
    "en_route",
    "approaching_destination",
    "arrived",
    "game_weekend",
    "return_trip",
    "complete",
  ]) {
    assert.ok(migration.includes(`'${phase}'`), `${phase} journey phase missing`);
  }

  assert.match(migration, /route_progress_percent\s+NUMERIC\(5,2\)/i);
  assert.match(migration, /distance_remaining_miles\s+NUMERIC\(8,2\)/i);
  assert.match(migration, /estimated_arrival_utc\s+TIMESTAMPTZ/i);
  assert.match(migration, /journey_progress_range/i);
});

test("commercial campaigns are separated from businesses and placements", () => {
  assert.match(migration, /business_id\s+BIGINT\s+REFERENCES businesses\(id\)/i);
  assert.match(migration, /campaign_id\s+BIGINT NOT NULL REFERENCES campaigns\(id\)/i);
  assert.match(migration, /placement_id\s+BIGINT NOT NULL REFERENCES placements\(id\)/i);

  for (const campaignType of ["destination", "route", "event", "network"]) {
    assert.ok(migration.includes(`'${campaignType}'`));
  }
});

test("interaction events preserve journey and commercial attribution", () => {
  for (const field of [
    "trip_id",
    "destination_id",
    "business_id",
    "campaign_id",
    "placement_id",
    "event_type",
    "journey_phase",
    "route_progress_percent",
    "occurred_at",
  ]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`, "i"), `${field} missing`);
  }

  assert.match(migration, /metadata\s+JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
});

test("initial monetizable surfaces are seeded idempotently", () => {
  for (const slug of [
    "drive-next-stop",
    "drive-meal",
    "destination-approach",
    "trip-hq-featured",
    "game-day-featured",
    "destination-dining",
  ]) {
    assert.ok(migration.includes(`'${slug}'`), `${slug} placement missing`);
  }

  assert.match(migration, /ON CONFLICT \(slug\) DO NOTHING/i);
});

test("Lubbock is the explicit pilot destination", () => {
  assert.match(migration, /'lubbock-tx'/i);
  assert.match(migration, /'Lubbock'/);
  assert.match(migration, /'Texas Tech'/);
  assert.match(migration, /'pilot'/);
});
