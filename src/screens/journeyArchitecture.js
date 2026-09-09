export const JOURNEY_SCREENS = [
  { id: "home", label: "Home", status: "active-boundary" },
  { id: "choose-team", label: "Choose Team", status: "active-boundary" },
  { id: "choose-game", label: "Choose Game", status: "active-boundary" },
  { id: "trip-hq", label: "Trip HQ", status: "active-boundary" },
  {
    id: "plan-route-schedule",
    label: "Plan: Route & Schedule",
    status: "active-boundary",
  },
  {
    id: "plan-along-the-way",
    label: "Plan: Along the Way",
    status: "active-boundary",
  },
  {
    id: "plan-stay-itinerary",
    label: "Plan: Stay & Itinerary",
    status: "active-boundary",
  },
  { id: "drive", label: "Drive", status: "active-boundary" },
  {
    id: "game-weekend",
    label: "Game Weekend",
    status: "active-boundary",
  },
  { id: "game-day", label: "Game Day", status: "active-boundary" },
];

const JOURNEY_SCREEN_IDS = new Set(JOURNEY_SCREENS.map((screen) => screen.id));

export function parseJourneyHash(hash = "") {
  const screenId = String(hash).replace(/^#\/?/, "").trim();
  return JOURNEY_SCREEN_IDS.has(screenId) ? screenId : "home";
}

export function getJourneyHash(screenId) {
  return `#/${JOURNEY_SCREEN_IDS.has(screenId) ? screenId : "home"}`;
}
