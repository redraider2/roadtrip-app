import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { getUpcomingGames, getGameTeams, formatGameMatchup, gameDestinationLabel, isCollegeFootballPlayoff, playoffRoundLabel } from "../src/lib/footballSchedule.js";

const require = createRequire(import.meta.url);
const { loadTeamSchedule, filterTeamSchedule } = require("../backend/src/footballSchedule.js");
const venueName = (_id, name) => name;
const fixture = [
  { id: 1, homeTeam: "Texas", awayTeam: "TCU", seasonType: "regular", startDate: "2026-11-21T18:00:00Z", venueId: 1 },
  { id: 2, homeTeam: "Texas", awayTeam: "Oklahoma", neutralSite: true, seasonType: "regular", startDate: "2026-12-01T18:00:00Z", venueId: 499, venue: "Cotton Bowl" },
  { id: 3, homeTeam: "TCU", awayTeam: "Texas", seasonType: "regular", startDate: "2026-11-28T18:00:00Z", venueId: 3 },
  { id: 4, homeTeam: "Texas", awayTeam: "Oregon", neutralSite: true, seasonType: "postseason", startDate: "2027-01-01T18:00:00Z", venueId: 1056, venue: "Rose Bowl", notes: "Rose Bowl Game" },
  { id: 5, homeTeam: "Georgia", awayTeam: "Texas", neutralSite: true, seasonType: "postseason", startDate: "2026-12-27T18:00:00Z", venueId: 5, playoff: { competition: "cfp", round: "quarterfinal", bowlName: "Peach Bowl" } },
  { id: 6, homeTeam: "Texas", awayTeam: "Clemson", seasonType: "postseason", startDate: "2026-12-20T18:00:00Z", venueId: 1 },
  { id: 7, homeTeam: "SMU", awayTeam: "Memphis", seasonType: "postseason" },
];

async function schedule(includePostseason = true) {
  return loadTeamSchedule({ team: "Texas", year: 2026, includePostseason, venueName, fetchGames: async url => {
    assert.equal(url.searchParams.get("year"), "2026");
    assert.equal(url.searchParams.get("team"), "Texas");
    assert.equal(url.searchParams.get("seasonType"), includePostseason ? "both" : "regular");
    return [...fixture, fixture[3]];
  } });
}

test("request both season types, deduplicate and sort January bowls in their football season", async () => {
  const games = await schedule();
  assert.deepEqual(games.map(g => g.id), [1, 3, 2, 6, 5, 4]);
  assert.equal(games.at(-1).eventName, "Rose Bowl Game");
  assert.equal(games.find(g => g.id === 5).bowlName, "Peach Bowl");
  assert.equal(games.at(-1).venueId, 1056);
  assert.equal(games.at(-1).venue, "Rose Bowl");
  assert.equal(games.find(g => g.id === 2).seasonType, "regular");
});

test("road selection includes either neutral designation and postseason, excluding regular home games", async () => {
  const games = await schedule();
  assert.deepEqual(filterTeamSchedule(games, { roadOnly: true }).map(g => g.id), [3, 2, 6, 5, 4]);
  assert.deepEqual(filterTeamSchedule(games, { awayOnly: true }).map(g => g.id), [3]);
  assert.equal(filterTeamSchedule(games, {}).length, 6);
  await schedule(false);
});

test("neutral matchups show the selected team once, followed by its actual opponent", () => {
  assert.deepEqual(getGameTeams(fixture[3], "Texas"), { first: "Texas", second: "Oregon", separator: "vs" });
  assert.equal(formatGameMatchup(fixture[4], "Texas"), "Texas vs Georgia");
  assert.equal(formatGameMatchup(fixture[2], "Texas"), "Texas @ TCU");
  assert.equal(formatGameMatchup(fixture[5], "Texas"), "Clemson @ Texas");
  assert.equal(gameDestinationLabel(fixture[3]), "Postseason · Neutral-site destination");
  assert.equal(gameDestinationLabel(fixture[5]), "Postseason destination");
  assert.equal(gameDestinationLabel(fixture[1]), "Neutral-site destination");
});

test("completed postseason games disappear even if date is TBD; January games remain upcoming", () => {
  const games = [...fixture, { id: "done", completed: true, startTimeTBD: true }];
  const upcoming = getUpcomingGames(games, new Date("2026-12-31T18:00:00Z"));
  assert.ok(upcoming.some(g => g.id === 4));
  assert.ok(!upcoming.some(g => g.id === "done"));
});

test("provider failures propagate instead of presenting an incomplete schedule", async () => {
  await assert.rejects(loadTeamSchedule({ team: "Texas", year: 2026, includePostseason: true, venueName, fetchGames: async () => { throw new Error("Provider unavailable"); } }), /Provider unavailable/);
});

test("CFP section uses playoff metadata or an explicit event label, never the bowl venue alone", async () => {
  const games = await schedule();
  const playoff = games.filter(isCollegeFootballPlayoff);
  assert.deepEqual(playoff.map(game => game.id), [5]);
  assert.equal(playoffRoundLabel(playoff[0]), "Quarterfinal");
  assert.equal(isCollegeFootballPlayoff({ eventName: "College Football Playoff First Round" }), true);
  assert.equal(isCollegeFootballPlayoff({ eventName: "CFP Semifinal at the Rose Bowl" }), true);
  assert.equal(isCollegeFootballPlayoff({ eventName: "Rose Bowl Game" }), false);
  assert.equal(playoffRoundLabel({ playoff: { round: "championship" } }), "National Championship");
});


test("a regular-season fallback cannot masquerade as a complete bowl schedule", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response("Provider unavailable", { status: 503 });
  try {
    require("../backend/src/cfbdFallback.js");
    const response = await global.fetch("https://api.collegefootballdata.com/games?team=Houston&year=2026&seasonType=both");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("X-Kickoff-Miles-Fallback"), null);
  } finally {
    global.fetch = originalFetch;
  }
});
