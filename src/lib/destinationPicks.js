import content from "../data/destinationPicks.json" with { type: "json" };
import { partnerMatchesDestination } from "./destinationAdvertising.js";

// Match the actual destination venue, never the fan's selected team or a city substring.
export function getDestinationPicks(venueId) {
  const destination = content.destinations.find((item) => partnerMatchesDestination(item, venueId));
  if (!destination) return null;
  return {
    ...destination,
    entries: destination.entries.filter((entry) => entry.verificationStatus === "source_checked"
      && entry.publicationStatus === "implementation_candidate"),
  };
}

export function getRecommendationPartners(venueId, excludeNames = []) {
  const excluded = new Set(excludeNames.filter(Boolean).map((name) => name.trim().toLowerCase()));
  return (getDestinationPicks(venueId)?.entries || [])
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
export function recommendationFallback(partner, venueId, index = 0) {
  if (partner && !partner.isHouseAd && !partner.isDevelopmentPreview) return partner;
  return getRecommendationPartners(venueId)[index] || partner;
}
