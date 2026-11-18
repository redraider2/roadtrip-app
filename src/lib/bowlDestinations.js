import content from "../data/bowlDestinations.json" with { type: "json" };

export const bowlDestinations = content.destinations;

export function getBowlDestination(venueId) {
  if (venueId === null || venueId === undefined || venueId === "") return null;
  return bowlDestinations.find(destination => destination.destinationVenueIds.includes(String(venueId).trim())) || null;
}

export function getBowlDestinationById(destinationId) {
  return bowlDestinations.find(destination => destination.destinationId === destinationId) || null;
}

export function isPostseasonTrip(game, trip) {
  if (game) return game.seasonType === "postseason" || game.playoff?.competition === "cfp";
  // Saved trip notes start with the event name when one was supplied. A regular
  // UCLA trip's first segment is its date, even though its stadium is the Rose Bowl.
  const eventName = String(trip?.notes || "").split(" · ")[0];
  return /\bbowl\b|\bCFP\b|college football playoff/i.test(eventName);
}

export function usesBowlHostGuide(game, trip) {
  if (!isPostseasonTrip(game, trip)) return false;
  const eventName = game?.eventName || String(trip?.notes || "").split(" · ")[0];
  // A campus can also host a bowl. Its CFP first-round game must keep campus
  // resources instead of inheriting a different bowl organizer's instructions.
  return game?.playoff?.round !== "first_round" && !/first[ -]round/i.test(eventName);
}

export function getBowlGuidePicks(destination) {
  return destination?.entries.filter(entry => entry.verificationStatus === "source_checked" && entry.publicationStatus === "implementation_candidate") || [];
}

export function bowlVenueLocation(venue) {
  const destination = getBowlDestination(venue.id);
  // CFBD currently reports Independence Stadium in Shreveport, FL. The host
  // listing confirms Louisiana; retain provider identity but correct routing.
  return destination ? { ...venue, city: destination.city, state: destination.state } : venue;
}
