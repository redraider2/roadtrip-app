import { partnerMatchesDestination } from "./destinationAdvertising.js";

// Venue ID verified against the project's R6 Game Day Guide tracker.
// Four screens and CTA targets confirmed by the user; all placement eligibility is explicit.
export const culinaryGangsterTempe = {
  id: "culinary_gangster_tempe",
  businessName: "Culinary Gangster Tempe",
  market: "tempe",
  displayAddress: "501 S Mill Avenue · Tempe",
  destinationVenueIds: ["3947"],
  creatives: {
    directions: {
      imageUrl: "partners/culinary-gangster-tempe-directions.png",
      alt: "Culinary Gangster: Make Tempe your next bite. Burger and loaded fries.",
      linkLabel: "Get Directions to Culinary Gangster Tempe (opens in a new tab)",
      action: "directions",
      ctaLabel: "Get Directions",
      headline: "Make Tempe your next bite.",
      width: 1536,
      height: 1024,
    },
    game_day: {
      imageUrl: "partners/culinary-gangster-tempe-game-day.png",
      alt: "Culinary Gangster: Bring your game-day appetite. Burger and gyro fries.",
      linkLabel: "Explore the Menu at Culinary Gangster Tempe (opens in a new tab)",
      action: "view_menu",
      ctaLabel: "Explore the Menu",
      headline: "Bring your game-day appetite.",
      width: 1536,
      height: 1024,
    },
    menu: {
      imageUrl: "partners/culinary-gangster-tempe-menu.png",
      alt: "Culinary Gangster: Big flavor. Game on. Burger on Mill Avenue.",
      linkLabel: "View Menu at Culinary Gangster Tempe (opens in a new tab)",
      action: "view_menu",
      ctaLabel: "View Menu",
      headline: "Big flavor. Game on.",
      width: 1536,
      height: 1024,
    },
  },
  placements: {
    trip_hq: "directions",
    along_the_way: "game_day",
    game_weekend: "menu",
    game_day: "game_day",
  },
  placementContent: {
    trip_hq: { sentence: "Plan a food stop in Tempe.", actions: ["directions", "view_menu"] },
    along_the_way: { heading: "When you reach Tempe", sentence: "Your arrival meal in Tempe.", actions: ["view_menu"] },
    game_weekend: { sentence: "Explore the menu for your Tempe weekend.", actions: ["view_menu"] },
    game_day: { sentence: "Bring your game-day appetite.", actions: ["view_menu", "directions"] },
  },
  links: {
    directions: "https://www.google.com/maps/dir/?api=1&destination=501%20S%20Mill%20Avenue%2C%20Tempe%2C%20AZ",
    view_menu: "https://culinarygangsterusa.com/menu/tempe",
  },
};

export function selectDestinationArtwork(campaign, venueId, placement) {
  if (!partnerMatchesDestination(campaign, venueId)) return null;
  const creativeId = campaign.placements?.[placement];
  const creative = campaign.creatives?.[creativeId];
  const href = campaign.links?.[creative?.action];
  if (!creative || !href) return null;
  try {
    const url = new URL(href);
    if (!["https:", "http:"].includes(url.protocol)) return null;
  } catch {
    return null;
  }
  return { creativeId, creative, href };
}
