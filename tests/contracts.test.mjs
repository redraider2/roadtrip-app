import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const serverSource = await readFile(
  new URL("../backend/src/server.js", import.meta.url),
  "utf8"
);

const publicContracts = [
  ['post', '/route'],
  ['post', '/football/along-the-way'],
  ['get', '/football/teams'],
  ['get', '/football/games'],
  ['get', '/football/venues/:venueId/featured-partner'],
  ['get', '/football/venues/:venueId/tailgating'],
  ['get', '/football/venues/:venueId/game-day-guide'],
  ['get', '/football/venues/:venueId'],
  ['get', '/football/venues/:venueId/places'],
];

const authenticatedContracts = [
  ['get', '/trips'],
  ['post', '/trips'],
  ['patch', '/trips/:id/favorite'],
  ['get', '/trips/:tripId/stops'],
  ['delete', '/trips/:id'],
  ['post', '/trips/:tripId/stops'],
  ['delete', '/stops/:id'],
  ['patch', '/stops/:id/route'],
  ['patch', '/stops/:id/order'],
];

test("public planning and game-weekend API routes remain available", () => {
  for (const [method, path] of publicContracts) {
    assert.match(
      serverSource,
      new RegExp(`app\\.${method}\\(\\"${path.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\"`),
      `${method.toUpperCase()} ${path}`
    );
  }
});

test("trip and stop APIs remain protected by requireAuth", () => {
  for (const [method, path] of authenticatedContracts) {
    assert.ok(
      serverSource.includes(`app.${method}("${path}", requireAuth,`),
      `${method.toUpperCase()} ${path}`
    );
  }
});

test("game-day guide response retains all four sections", () => {
  for (const responseKey of [
    "tailgating:",
    "parkingArrival:",
    "knowBeforeYouGo:",
    "traditions:",
    "lastVerified:",
  ]) {
    assert.ok(serverSource.includes(responseKey), responseKey);
  }
});

test("guest trip creation remains a local preview path", () => {
  assert.ok(appSource.includes("if (!auth)"));
  assert.ok(appSource.includes("isPreview: true"));
  assert.ok(appSource.includes("isGuestStop: true"));
});

test("authenticated happy path retains tokenized trip and stop persistence", () => {
  assert.ok(appSource.includes('headers.set("Authorization", `Bearer ${token}`)'));
  assert.ok(appSource.includes('`${API_BASE_URL}/trips`'));
  assert.ok(appSource.includes('`${API_BASE_URL}/trips/${activeTrip.id}/stops`'));
});

test("Northwestern continues to derive venue context from game-level data", () => {
  assert.ok(appSource.includes("selectedFootballGame?.venueId || activeTrip?.venueId"));
  assert.ok(appSource.includes("selectedFootballGame?.venue ||"));
});
