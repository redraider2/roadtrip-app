import { partnerMatchesDestination } from "./destinationAdvertising.js";

// Consumer discovery inventory; placement eligibility is explicit and destination-scoped.
export const destinationPartners = [{
  id: "cactus_theater",
  market: "lubbock",
  marketName: "Lubbock",
  destinationVenueIds: ["3784"],
  businessName: "CACTUS THEATER",
  name: "Cactus Theater",
  address: "1812 Buddy Holly Ave., Lubbock, TX 79401",
  displayAddress: "1812 Buddy Holly Ave.",
  imageUrl: "partners/cactus-theater.jpg",
  imageAlt: "Cactus Theater front entrance and illuminated marquee",
  eventsUrl: "https://cactustheater.com/events/",
  summary: "Historic live entertainment in Lubbock.",
  headline: "Make a Cactus show part of your Lubbock road trip.",
  description: "Historic live entertainment in the heart of Lubbock’s Depot District.",
  placements: {
    trip_hq: { creative: "featured", actions: ["view_events", "directions", "save_to_trip"] },
    stay_itinerary: { creative: "small", heading: "Add Something to Your Trip", actions: ["view_events", "save_to_trip"] },
    game_weekend: { creative: "featured", actions: ["view_events", "directions", "save_to_trip"] },
  },
}];

export function getDestinationPartners(venueId, placement) {
  return destinationPartners.filter((partner) =>
    partnerMatchesDestination(partner, venueId) && partner.placements[placement]
  );
}

export function partnerDirectionsUrl(partner) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(partner.address)}`;
}

export function isDestinationPartnerSaved(partner, stops) {
  return stops.some((stop) => stop.name?.trim().toLowerCase() === partner.name.toLowerCase()
    && stop.notes === partner.address);
}
