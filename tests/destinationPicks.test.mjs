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
  for (const venue of [null, undefined, "", "9999", 3636]) assert.equal(getDestinationPicks(venue), null);
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
