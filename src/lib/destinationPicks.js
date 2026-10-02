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
