import { partnerMatchesDestination } from "./destinationAdvertising.js";

// Four distinct creatives for the Arizona State destination (venue 3947).
export const culinaryGangsterTempe = {
  "id": "culinary_gangster_tempe",
  "businessName": "Culinary Gangster Tempe",
  "market": "tempe",
  "displayAddress": "501 S Mill Ave #200 \u00b7 Tempe",
  "destinationVenueIds": [
    "3947"
  ],
  "creatives": {
    "burger_fries": {
      "imageUrl": "partners/culinary-gangster-tempe-burger-fries-20261028.png",
      "alt": "Culinary Gangster Tempe: Make Tempe your next bite. Burger, crinkle-cut fries and beer.",
      "linkLabel": "Explore the Menu at Culinary Gangster Tempe (opens in a new tab)",
      "action": "view_menu",
      "ctaLabel": "Explore the Menu",
      "headline": "Make Tempe your next bite.",
      "width": 1536,
      "height": 1024
    },
    "hot_honey_chicken": {
      "imageUrl": "partners/culinary-gangster-tempe-hot-honey-chicken-20261028.png",
      "alt": "Culinary Gangster Tempe: Bring the heat. Hot Honey Chicken Sandwich, loaded fries and beer.",
      "linkLabel": "Explore the Menu at Culinary Gangster Tempe (opens in a new tab)",
      "action": "view_menu",
      "ctaLabel": "Explore the Menu",
      "headline": "Bring the heat.",
      "width": 1536,
      "height": 1024
    },
    "street_gyros": {
      "imageUrl": "partners/culinary-gangster-tempe-street-gyros-20261028.png",
      "alt": "Culinary Gangster Tempe: Wrap up your game plan. Street Gyros and a cocktail.",
      "linkLabel": "Explore the Menu at Culinary Gangster Tempe (opens in a new tab)",
      "action": "view_menu",
      "ctaLabel": "Explore the Menu",
      "headline": "Wrap up your game plan.",
      "width": 1536,
      "height": 1024
    },
    "chicken_avocado_bowl": {
      "imageUrl": "partners/culinary-gangster-tempe-chicken-avocado-bowl-20261028.png",
      "alt": "Culinary Gangster Tempe: Fresh fuel. Big flavor. Chicken Avocado Quinoa Bowl and a citrus cocktail.",
      "linkLabel": "Explore the Menu at Culinary Gangster Tempe (opens in a new tab)",
      "action": "view_menu",
      "ctaLabel": "Explore the Menu",
      "headline": "Fresh fuel. Big flavor.",
      "width": 1536,
      "height": 1024
    }
  },
  "placements": {
    "trip_hq": "burger_fries",
    "along_the_way": "chicken_avocado_bowl",
    "game_weekend": "street_gyros",
    "game_day": "hot_honey_chicken"
  },
  "placementContent": {
    "trip_hq": {
      "sentence": "Make Tempe your next bite with a burger and fries.",
      "actions": [
        "view_menu",
        "directions"
      ]
    },
    "along_the_way": {
      "heading": "When you reach Tempe",
      "sentence": "Fresh fuel for your arrival: try the Chicken Avocado Quinoa Bowl.",
      "actions": [
        "view_menu"
      ]
    },
    "game_weekend": {
      "sentence": "Wrap up your game-weekend plans with Street Gyros.",
      "actions": [
        "view_menu"
      ]
    },
    "game_day": {
      "sentence": "Bring the heat with Hot Honey Chicken and loaded fries.",
      "actions": [
        "view_menu",
        "directions"
      ]
    }
  },
  "links": {
    "directions": "https://www.google.com/maps/dir/?api=1&destination=501%20S%20Mill%20Ave%20%23200%2C%20Tempe%2C%20AZ",
    "view_menu": "https://culinarygangsterusa.com/menu/tempe"
  }
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
