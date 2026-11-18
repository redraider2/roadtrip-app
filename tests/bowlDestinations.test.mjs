import test from "node:test";
import assert from "node:assert/strict";
import { bowlDestinations, getBowlDestination, getBowlDestinationById, getBowlGuidePicks, isPostseasonTrip, usesBowlHostGuide, bowlVenueLocation } from "../src/lib/bowlDestinations.js";
import { getDestinationPicks, getRecommendationPartners, recommendationFallback } from "../src/lib/destinationPicks.js";

test("2026 host catalog covers seven CFP sites with exact, unique API venue identities", () => {
  assert.equal(bowlDestinations.length, 37);
  assert.equal(bowlDestinations.filter(d => d.cfpRound).length, 7);
  const venueIds = new Set();
  const entryIds = new Set();
  for (const destination of bowlDestinations) {
    for (const id of destination.destinationVenueIds) {
      assert.ok(!venueIds.has(id), `Duplicate venue ${id}`);
      venueIds.add(id);
      assert.equal(Number(id), destination.venueEvidence.venueId);
      assert.equal(getBowlDestination(id), destination);
    }
    assert.equal(destination.season, 2026);
    assert.ok(destination.arrival.length >= 2);
    for (const entry of getBowlGuidePicks(destination)) {
      assert.ok(!entryIds.has(entry.id)); entryIds.add(entry.id);
      assert.equal(new URL(entry.url).protocol, "https:");
      assert.ok(entry.sourceCheckedOn);
      assert.ok(!/university resource/i.test(entry.actions[0].label));
    }
  }
  assert.equal(venueIds.size, 35);
  assert.equal(getBowlDestination(999999), null);
  assert.equal(getBowlDestination(null), null);
});

test("new Puerto Rico hosts are browsable without inventing provider venue IDs", () => {
  for (const id of ["BOWL-SAN-JUAN", "BOWL-BAYAMON"]) {
    const guide = getBowlDestinationById(id);
    assert.equal(guide.state, "PR");
    assert.deepEqual(guide.destinationVenueIds, []);
    assert.equal(guide.venueEvidence.matchStatus, "awaiting_provider_venue");
    assert.ok(guide.travelNote);
    assert.ok(getBowlGuidePicks(guide).length >= 5);
  }
});

test("renamed and relocated bowls use current venues, not previous seasons' locations", () => {
  assert.ok(getBowlDestination(3652).events.includes("Cure Bowl"));
  assert.ok(!getBowlDestination(4013).events.includes("Cure Bowl"));
  assert.ok(getBowlDestination(3947).events.includes("Cactus Bowl"));
  assert.equal(getBowlDestination(4251), null); // Former Rate Bowl at Chase Field.
  assert.ok(getBowlDestination(5455).events.includes("Frisco Bowl"));
  assert.equal(getBowlDestination(3970).market, "Glendale");
  assert.equal(getBowlDestination(3687).market, "Arlington");
  assert.equal(getBowlDestination(1056).market, "Pasadena");
});

test("bowl context replaces campus policy links without changing regular-season recommendations", () => {
  assert.equal(getDestinationPicks(1056).teamName, "UCLA");
  const postseason = getDestinationPicks(1056, { postseason: true });
  assert.equal(postseason.destinationId, "BOWL-PASADENA");
  const gameDay = getRecommendationPartners(1056, [], "Game Day", { postseason: true });
  assert.ok(gameDay.length);
  assert.ok(gameDay.every(p => !/uclabruins\.com/.test(p.websiteUrl)));
  assert.equal(getDestinationPicks(5348), null);
  assert.equal(getDestinationPicks(5348, { postseason: true }).market, "Atlanta");
  const sponsor = { businessName: "Existing sponsor", websiteUrl: "https://example.com" };
  assert.equal(recommendationFallback(sponsor, 5348, 0, "Game Day", { postseason: true }), sponsor);
  const campus = { businessName: "Home campus sponsor", destinationVenueIds: ["721"] };
  assert.ok(!getBowlDestination(5348).destinationVenueIds.includes(campus.destinationVenueIds[0]));
});

test("saved bowl notes restore the guide but ordinary Rose Bowl stadium trips do not", () => {
  assert.equal(isPostseasonTrip({ seasonType: "postseason" }), true);
  assert.equal(isPostseasonTrip({ playoff: { competition: "cfp" } }), true);
  assert.equal(isPostseasonTrip(null, { notes: "Rose Bowl · Jan 1, 2027 · Rose Bowl" }), true);
  assert.equal(isPostseasonTrip(null, { notes: "College Football Playoff First Round Game · Dec 18, 2026 · Campus" }), true);
  assert.equal(isPostseasonTrip(null, { notes: "Nov 21, 2026 · Rose Bowl" }), false);
  assert.equal(isPostseasonTrip({ seasonType: "regular" }, { notes: "Rose Bowl · Jan 1, 2027" }), false);
});

test("official host location corrects provider state errors before route creation", () => {
  assert.equal(bowlVenueLocation({ id: 3766, city: "Shreveport", state: "FL" }).state, "LA");
  const other = { id: 99999, city: "Other", state: "TX" };
  assert.equal(bowlVenueLocation(other), other);
});

test("campus CFP first-round games never inherit another bowl organizer's guide", () => {
  const game = { venueId: 3616, seasonType: "postseason", playoff: { competition: "cfp", round: "first_round" } };
  assert.equal(usesBowlHostGuide(game), false);
  assert.equal(usesBowlHostGuide(null, { notes: "College Football Playoff First Round Game · Dec 18, 2026 · Amon G. Carter Stadium" }), false);
  assert.equal(usesBowlHostGuide({ seasonType: "postseason", eventName: "Armed Forces Bowl", venueId: 3616 }), true);
});
