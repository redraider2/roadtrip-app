import test from "node:test";
import assert from "node:assert/strict";
import { getUpcomingGames } from "../src/lib/footballSchedule.js";

test("past games and kickoffs that have started are excluded", () => {
  const games = [
    { id: "past", startDate: "2026-10-10T18:00:00Z" },
    { id: "started", startDate: "2026-10-12T18:00:00Z" },
    { id: "upcoming", startDate: "2026-10-12T19:00:00Z" },
    { id: "future", startDate: "2026-10-17T18:00:00Z" },
  ];
  assert.deepEqual(
    getUpcomingGames(games, new Date("2026-10-12T18:00:00Z")).map(game => game.id),
    ["upcoming", "future"]
  );
  assert.equal(games.length, 4);
});

test("TBD kickoffs stay available through their listed day despite placeholder timestamps", () => {
  const games = [
    { id: "yesterday", startDate: "2026-10-11T00:00:00Z", startTimeTBD: true },
    { id: "today", startDate: "2026-10-12T00:00:00Z", startTimeTBD: true },
    { id: "tomorrow", startDate: "2026-10-13T00:00:00Z", startTimeTBD: true },
  ];
  assert.deepEqual(
    getUpcomingGames(games, new Date(2026, 9, 12, 23, 59)).map(game => game.id),
    ["today", "tomorrow"]
  );
  assert.deepEqual(
    getUpcomingGames(games, new Date(2026, 9, 13, 0, 0)).map(game => game.id),
    ["tomorrow"]
  );
});

test("unannounced dates remain available and elapsed selections cannot be found", () => {
  const games = [{ id: "missing" }, { id: "invalid", startDate: "TBD" }];
  assert.deepEqual(getUpcomingGames(games), games);
  const kickoff = { id: "selected", startDate: "2026-10-17T18:00:00Z" };
  assert.equal(getUpcomingGames([kickoff], new Date("2026-10-17T17:59:00Z")).length, 1);
  assert.equal(getUpcomingGames([kickoff], new Date("2026-10-17T18:01:00Z")).find(game => game.id === "selected"), undefined);
});
