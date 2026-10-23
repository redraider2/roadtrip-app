import { getNashvilleRecommendations } from "./nashvilleRecommendations.js";
import content from "../data/destinationPicks.json" with { type: "json" };
import { partnerMatchesDestination } from "./destinationAdvertising.js";

// Match the actual destination venue, never the fan's selected team or a city substring.
export function getDestinationPicks(venueId) {
  const destination = content.destinations.find((item) => partnerMatchesDestination(item, venueId));
  if (!destination) return null;
  return {
    ...destination,
    entries: getNashvilleRecommendations(venueId, "destination") ? [] : destination.entries.filter((entry) => entry.verificationStatus === "source_checked"
      && entry.publicationStatus === "implementation_candidate"
      && (!entry.venuePolicyScope || entry.venuePolicyScope.includes(String(venueId).trim()))),
  };
}

// Stable page-specific selections reuse the verified destination inventory.
// Nashville's supplied visitor program retains its existing selection order.
const PAGE_CATEGORIES = {
  "Trip HQ": ["activity", "explore", "visitor"],
  "Route & Schedule": ["stay", "visitor"],
  "Road Trip Partner": ["stay", "visitor"],
  "Along the Way": ["visitor", "explore"],
  "Stay & Itinerary": ["stay", "food"],
  "Game Weekend": ["food", "activity", "explore"],
  "Game Day": ["gameday", "food", "visitor"],
  Drive: ["visitor", "food"],
  "On the Road": ["visitor", "food"],
};

function categoryGroup(category = "") {
  if (/lodging|stay/i.test(category)) return "stay";
  if (/game day/i.test(category)) return "gameday";
  if (/visitor|local community/i.test(category)) return "visitor";
  if (/eat|food|coffee/i.test(category)) return "food";
  if (/things to do|art|culture|entertainment/i.test(category)) return "activity";
  return "explore";
}

function pageEntries(venueId, contextLabel) {
  const entries = getDestinationPicks(venueId)?.entries || [];
  const categories = String(venueId).trim() === "3973" ? null : PAGE_CATEGORIES[contextLabel];
  if (!categories) return entries;
  return categories.flatMap(category => entries.filter(entry => categoryGroup(entry.category) === category));
}

export function getRecommendationPartners(venueId, excludeNames = [], contextLabel = "") {
  const excluded = new Set(excludeNames.filter(Boolean).map((name) => name.trim().toLowerCase()));
  return pageEntries(venueId, contextLabel)
    .filter((entry) => !excluded.has(entry.title.trim().toLowerCase()))
    .map((entry) => ({
      id: entry.id,
      businessName: entry.title,
      description: entry.summary,
      locationText: `${getDestinationPicks(venueId).market} · ${entry.category}`,
      websiteUrl: entry.url,
      websiteLabel: entry.seasonality ? "Check seasonal dates" : entry.actions[0]?.label || "Visit website",
      isEditorial: true,
      editorialLabel: entry.displayLabel,
    }));
}

// Only an unsold house position may be filled; actual advertisers are returned unchanged.
export function recommendationFallback(partner, venueId, index = 0, contextLabel = "") {
  if (partner && !partner.isHouseAd && !partner.isDevelopmentPreview) return partner;
  return getRecommendationPartners(venueId, [], contextLabel)[index] || partner;
}
