import test from "node:test";
import assert from "node:assert/strict";
import { getDestinationPicks, getRecommendationPartners, recommendationFallback } from "../src/lib/destinationPicks.js";
import { destinationPartners } from "../src/lib/destinationPartners.js";
import { culinaryGangsterTempe } from "../src/lib/destinationArtworkCampaigns.js";

test("all selected destination venues have six source-checked recommendations", () => {
  for (const venue of [3784, 3947, 4728, 3895, 3604, 3910, 3994, 3795, 4727]) {
    const destination = getDestinationPicks(venue);
    assert.equal(destination.entries.length, 6);
    for (const entry of destination.entries) {
      assert.equal(entry.verificationStatus, "source_checked");
      assert.ok(entry.sourceCheckedOn);
      for (const action of entry.actions) assert.equal(new URL(action.url).protocol, "https:");
    }
  }
});

test("unknown and neutral-site venues do not receive a team's home-city picks", () => {
  for (const venue of [null, undefined, "", "9999", 3634]) assert.equal(getDestinationPicks(venue), null);
  assert.equal(getDestinationPicks(" 3784 ").teamName, "Texas Tech");
});

test("Houston and Rice use separate destination inventories", () => {
  assert.equal(getDestinationPicks(4728).teamName, "Houston");
  assert.equal(getDestinationPicks(3895).teamName, "Rice");
  assert.notEqual(getDestinationPicks(4728).entries[0].title, getDestinationPicks(3895).entries[0].title);
});

test("editorial inventory is independent of existing paid and complimentary placements", () => {
  assert.equal(culinaryGangsterTempe.destinationVenueIds[0], "3947");
  assert.equal(Object.keys(culinaryGangsterTempe.placements).length, 4);
  assert.equal(destinationPartners.find((p) => p.id === "cactus_theater").destinationVenueIds[0], "3784");
  const titles = [getDestinationPicks(3947), getDestinationPicks(3784)].flatMap((d) => d.entries.map((e) => e.title));
  assert.ok(!titles.includes("Culinary Gangster Tempe"));
  assert.ok(!titles.includes("Cactus Theater"));
});

test("seasonal recommendation stays explicitly labeled", () => {
  const seasonal = getDestinationPicks(3795).entries.find((e) => e.seasonality);
  assert.match(seasonal.title, /seasonal/);
  assert.match(seasonal.summary, /November/);
});

test("recommendations fill house inventory and return paying partners unchanged", () => {
  const paying = { id: "paid-hotel", businessName: "Paid Hotel" };
  assert.equal(recommendationFallback(paying, 3947), paying);
  assert.equal(recommendationFallback(culinaryGangsterTempe, 3947), culinaryGangsterTempe);
  assert.equal(recommendationFallback({ isHouseAd: true }, 3947).businessName, "Proof Bread Tempe");
  assert.equal(recommendationFallback({ isHouseAd: true }, 3947, 1).businessName, "Omni Tempe Hotel at ASU");
});

test("small recommendation positions omit the featured business and existing partners", () => {
  const recommendations = getRecommendationPartners(3994, ["Motor Supply Co. Bistro", "Graduate by Hilton Columbia, S.C."]);
  assert.equal(recommendations.length, 4);
  assert.ok(recommendations.every((p) => p.isEditorial));
  assert.ok(recommendations.every((p) => !p.isHouseAd));
});

const reviewedVenues = [
  [3772, "Iowa State"], [3833, "Kansas"], [3636, "Kansas State"],
  [3646, "Oklahoma State"], [3652, "UCF"], [587, "Utah"], [3842, "West Virginia"],
];

test("seven reviewed destinations resolve by exact venue with only publication-eligible source links", () => {
  const entryIds = new Set();
  for (const [venue, team] of reviewedVenues) {
    const destination = getDestinationPicks(venue);
    assert.equal(destination.teamName, team);
    assert.equal(getDestinationPicks(` ${venue} `).destinationId, destination.destinationId);
    assert.equal(getDestinationPicks(`${venue}-unknown`), null);
    const activeCount = venue === 3842 ? 5 : 6;
    assert.equal(destination.entries.length, activeCount);
    for (const entry of destination.entries) {
      assert.ok(!entryIds.has(entry.id));
      entryIds.add(entry.id);
      assert.equal(entry.sourceCheckedOn, "2026-10-05");
      assert.equal(entry.publicationStatus, "implementation_candidate");
      assert.equal(new URL(entry.url).protocol, "https:");
      assert.equal(new URL(entry.sourceUrl).protocol, "https:");
      assert.ok(entry.actions.length > 0);
      for (const action of entry.actions) assert.equal(new URL(action.url).protocol, "https:");
    }
    assert.equal(getRecommendationPartners(venue).length, activeCount);
    const title = destination.entries[0].title;
    assert.equal(getRecommendationPartners(venue, [` ${title.toUpperCase()} `]).length, activeCount - 1);
  }
  assert.equal(entryIds.size, 41);
});

test("unverified seasonal excursion stays hidden and Wildwood warns about off-season", () => {
  assert.ok(getDestinationPicks(3842).entries.every((entry) => entry.id !== "DEST-025-E3"));
  assert.ok(getRecommendationPartners(3842).every((entry) => !entry.businessName.includes("Hovatter")));
  const wildwood = getDestinationPicks(3636).entries.find((entry) => entry.id === "DEST-021-E3");
  assert.match(wildwood.title, /seasonal/);
  assert.match(wildwood.summary, /off-season/);
  assert.equal(getRecommendationPartners(3636).find((entry) => entry.id === wildwood.id).websiteLabel, "Check seasonal dates");
  const vacant = { isHouseAd: true };
  assert.equal(recommendationFallback(vacant, 3842, 5), vacant);
});

test("new-city fallback preserves paid and complimentary partners in every slot", () => {
  for (const [venue] of reviewedVenues) {
    for (const relationship of ["paid_partner", "complimentary_partner"]) {
      const partner = { id: relationship, relationship, businessName: "Existing partner", destinationVenueIds: [String(venue)] };
      for (let slot = 0; slot < 6; slot++) assert.equal(recommendationFallback(partner, venue, slot), partner);
    }
    for (let slot = 0; slot < getDestinationPicks(venue).entries.length; slot++) {
      const result = recommendationFallback({ isHouseAd: true }, venue, slot);
      assert.equal(result.isEditorial, true);
      assert.equal(result.businessName, getDestinationPicks(venue).entries[slot].title);
    }
  }
  const empty = { isHouseAd: true };
  assert.equal(recommendationFallback(empty, "unknown"), empty);
});
