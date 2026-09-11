const MEAL_WINDOWS = [
  { start: 6, end: 10, type: "breakfast" },
  { start: 11, end: 14, type: "meal" },
  { start: 17, end: 21, type: "meal" },
];

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, number));
}

function getMealOpportunity(localHour) {
  const hour = Number(localHour);
  if (!Number.isFinite(hour)) return null;
  return MEAL_WINDOWS.find((window) => hour >= window.start && hour < window.end) || null;
}

function deriveRecommendationOpportunities({
  journeyPhase,
  routeProgressPercent,
  distanceRemainingMiles,
  localHour,
}) {
  const progress = clampProgress(routeProgressPercent) ?? 0;
  const remaining = Math.max(0, Number(distanceRemainingMiles) || 0);
  const opportunities = [];
  const mealWindow = getMealOpportunity(localHour);

  if (["departing", "en_route"].includes(journeyPhase)) {
    opportunities.push({ type: "next_stop", reason: "en_route_progress", weight: 50 });

    if (progress >= 20 && progress <= 85) {
      opportunities.push({ type: "fuel", reason: "route_progress", weight: 45 });
    }

    if (mealWindow) {
      opportunities.push({
        type: "meal",
        reason: `${mealWindow.type}_window`,
        weight: 70,
      });
    }
  }

  if (journeyPhase === "approaching_destination" || remaining <= 25) {
    opportunities.push({
      type: "destination",
      reason: "destination_approach",
      weight: 90,
    });

    if (mealWindow) {
      opportunities.push({
        type: "meal",
        reason: "arrival_meal_window",
        weight: 95,
      });
    }
  }

  if (["arrived", "game_weekend"].includes(journeyPhase)) {
    opportunities.push({ type: "featured_business", reason: journeyPhase, weight: 100 });
    if (mealWindow) {
      opportunities.push({ type: "meal", reason: "destination_meal_window", weight: 100 });
    }
  }

  return opportunities
    .sort((a, b) => b.weight - a.weight)
    .filter(
      (item, index, all) =>
        all.findIndex((candidate) => candidate.type === item.type) === index
    );
}

function targetSpecificity(candidate, context) {
  let score = 0;
  if (candidate.destination_id != null && String(candidate.destination_id) === String(context.destinationId)) score += 30;
  if (candidate.game_id != null && String(candidate.game_id) === String(context.gameId)) score += 25;
  if (candidate.journey_phase && candidate.journey_phase === context.journeyPhase) score += 20;
  if (candidate.min_progress_percent != null || candidate.max_progress_percent != null) score += 10;
  if (candidate.category) score += 5;
  return score;
}

function candidateMatches(candidate, context) {
  const progress = clampProgress(context.routeProgressPercent) ?? 0;

  if (candidate.status && candidate.status !== "active") return false;
  if (candidate.destination_id != null && String(candidate.destination_id) !== String(context.destinationId)) return false;
  if (candidate.game_id != null && String(candidate.game_id) !== String(context.gameId)) return false;
  if (candidate.journey_phase && candidate.journey_phase !== context.journeyPhase) return false;
  if (candidate.min_progress_percent != null && progress < Number(candidate.min_progress_percent)) return false;
  if (candidate.max_progress_percent != null && progress > Number(candidate.max_progress_percent)) return false;

  return true;
}

function rankCampaignCandidates(candidates, context) {
  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidate) => candidateMatches(candidate, context))
    .map((candidate) => ({
      ...candidate,
      recommendationScore:
        targetSpecificity(candidate, context) +
        Math.max(0, 1000 - (Number(candidate.priority) || 100)) / 100,
    }))
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return (Number(a.priority) || 100) - (Number(b.priority) || 100);
    });
}

module.exports = {
  deriveRecommendationOpportunities,
  getMealOpportunity,
  rankCampaignCandidates,
};
