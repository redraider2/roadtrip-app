import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  deriveRecommendationOpportunities,
  getMealOpportunity,
  rankCampaignCandidates,
} = require("../backend/src/journeyRecommendations.js");

test("meal windows are recognized without treating every hour as commercial inventory", () => {
  assert.equal(getMealOpportunity(8)?.type, "breakfast");
  assert.equal(getMealOpportunity(12)?.type, "meal");
  assert.equal(getMealOpportunity(18)?.type, "meal");
  assert.equal(getMealOpportunity(15), null);
});

test("en-route travelers receive route opportunities", () => {
  const opportunities = deriveRecommendationOpportunities({
    journeyPhase: "en_route",
    routeProgressPercent: 45,
    distanceRemainingMiles: 250,
    localHour: 12,
  });

  assert.ok(opportunities.some((item) => item.type === "next_stop"));
  assert.ok(opportunities.some((item) => item.type === "fuel"));
  assert.ok(opportunities.some((item) => item.type === "meal"));
  assert.ok(!opportunities.some((item) => item.type === "featured_business"));
});

test("approaching destination prioritizes destination and meal opportunities", () => {
  const opportunities = deriveRecommendationOpportunities({
    journeyPhase: "approaching_destination",
    routeProgressPercent: 94,
    distanceRemainingMiles: 18,
    localHour: 18,
  });

  assert.equal(opportunities[0].type, "meal");
  assert.ok(opportunities.some((item) => item.type === "destination"));
});

test("arrived travelers receive destination business opportunities", () => {
  const opportunities = deriveRecommendationOpportunities({
    journeyPhase: "arrived",
    routeProgressPercent: 100,
    distanceRemainingMiles: 0,
    localHour: 15,
  });

  assert.ok(opportunities.some((item) => item.type === "featured_business"));
});

test("campaign ranking rejects mismatched geography and journey targets", () => {
  const context = {
    destinationId: 1,
    gameId: 555,
    journeyPhase: "approaching_destination",
    routeProgressPercent: 95,
  };

  const candidates = [
    {
      id: 1,
      name: "Lubbock dinner partner",
      status: "active",
      destination_id: 1,
      game_id: 555,
      journey_phase: "approaching_destination",
      min_progress_percent: 90,
      priority: 10,
    },
    {
      id: 2,
      name: "Wrong destination",
      status: "active",
      destination_id: 2,
      priority: 1,
    },
    {
      id: 3,
      name: "Wrong phase",
      status: "active",
      destination_id: 1,
      journey_phase: "en_route",
      priority: 1,
    },
  ];

  const ranked = rankCampaignCandidates(candidates, context);
  assert.deepEqual(ranked.map((candidate) => candidate.id), [1]);
});

test("more specific campaigns outrank generic campaigns", () => {
  const context = {
    destinationId: 1,
    gameId: 555,
    journeyPhase: "game_weekend",
    routeProgressPercent: 100,
  };

  const ranked = rankCampaignCandidates(
    [
      { id: 1, status: "active", priority: 50 },
      {
        id: 2,
        status: "active",
        destination_id: 1,
        game_id: 555,
        journey_phase: "game_weekend",
        priority: 100,
      },
    ],
    context
  );

  assert.equal(ranked[0].id, 2);
});
