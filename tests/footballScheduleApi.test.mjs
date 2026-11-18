import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("../backend/src/server.js");

test("public schedule endpoint separates postseason cache and retains legacy away-only behavior", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.CFBD_API_KEY;
  process.env.CFBD_API_KEY = "test-only";
  const calls = [];
  const regular = [
    { id: 1, homeTeam: "Fixture Team", awayTeam: "Visitor", seasonType: "regular", venueId: 10 },
    { id: 2, homeTeam: "Host", awayTeam: "Fixture Team", seasonType: "regular", venueId: 20 },
    { id: 3, homeTeam: "Fixture Team", awayTeam: "Neutral Opponent", seasonType: "regular", neutralSite: true, venueId: 30 },
  ];
  global.fetch = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "api.collegefootballdata.com");
    const type = parsed.searchParams.get("seasonType");
    calls.push(type);
    return Response.json(type === "both" ? [...regular, {
      id: 4, homeTeam: "Fixture Team", awayTeam: "Bowl Opponent", neutralSite: true,
      seasonType: "postseason", startDate: "2027-01-01T18:00:00Z", venueId: 40,
      playoff: { competition: "cfp", round: "quarterfinal", bowlName: "Fixture Bowl" },
    }] : regular);
  };
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/football/games?team=Fixture%20Team&year=2026`;
  try {
    const away = await (await originalFetch(`${base}&awayOnly=true`)).json();
    assert.deepEqual(away.map(game => game.id), [2]);
    const postseason = await (await originalFetch(`${base}&roadOnly=true&includePostseason=true`)).json();
    assert.deepEqual(postseason.map(game => game.id), [4, 2, 3]);
    assert.equal(postseason[0].eventName, "Fixture Bowl");
    assert.equal(postseason[0].playoff.round, "quarterfinal");
    assert.equal(postseason[0].venueId, 40);
    const all = await (await originalFetch(`${base}&includePostseason=true`)).json();
    assert.equal(all.length, 4);
    assert.deepEqual(calls, ["regular", "both"]);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.CFBD_API_KEY;
    else process.env.CFBD_API_KEY = originalKey;
    await new Promise(resolve => server.close(resolve));
  }
});
