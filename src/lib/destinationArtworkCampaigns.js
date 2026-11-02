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

// Supplied hotel artwork; viewports show the creative panels without preview-page chrome.
export const texasAmHotelCollegeStation = {
  "id": "texas_am_hotel_college_station",
  "businessName": "Texas A&M Hotel and Conference Center",
  "displayName": "Texas A&M Hotel and Conference Center",
  "market": "college_station",
  "marketLabel": "College Station",
  "displayAddress": "177 Joe Routt Boulevard \u00b7 College Station, TX",
  "destinationVenueIds": [
    "3795"
  ],
  "creatives": {
    "campus_home_base": {
      "imageUrl": "partners/texas-am-hotel-01-trip-hq-20261102.png",
      "alt": "Make campus your home base. Texas A&M Hotel and Conference Center.",
      "linkLabel": "Book at Texas A&M Hotel and Conference Center (opens in a new tab)",
      "action": "book_now",
      "width": 1440,
      "height": 1100,
      "crop": [
        110,
        379,
        1220,
        472
      ]
    },
    "arrival": {
      "imageUrl": "partners/texas-am-hotel-02-along-the-way-20261102.png",
      "alt": "The miles end. Your weekend begins. Arrive at Texas A&M Hotel.",
      "linkLabel": "Book at Texas A&M Hotel and Conference Center (opens in a new tab)",
      "action": "book_now",
      "width": 1440,
      "height": 1100,
      "crop": [
        110,
        477,
        1220,
        411
      ]
    },
    "weekend_stay": {
      "imageUrl": "partners/texas-am-hotel-03-game-weekend-20261102.png",
      "alt": "Check in. Settle in. Soak it all in. Texas A&M Hotel and Conference Center.",
      "linkLabel": "Book at Texas A&M Hotel and Conference Center (opens in a new tab)",
      "action": "book_now",
      "width": 1440,
      "height": 1100,
      "crop": [
        110,
        379,
        1220,
        509
      ]
    },
    "maroon_96": {
      "imageUrl": "partners/texas-am-hotel-04-game-day-20261102.png",
      "alt": "96 yards from Kyle Field. Closer to the game. Right in the experience. Texas A&M Hotel.",
      "linkLabel": "Book at Texas A&M Hotel and Conference Center (opens in a new tab)",
      "action": "book_now",
      "width": 1440,
      "height": 1100,
      "crop": [
        110,
        379,
        1220,
        453
      ],
      "allowedPlacements": [
        "game_weekend",
        "game_day"
      ]
    }
  },
  "placements": {
    "trip_hq": "campus_home_base",
    "along_the_way": "arrival",
    "game_weekend": "weekend_stay",
    "game_day": "maroon_96"
  },
  "placementContent": {
    "trip_hq": {
      "sentence": "Make campus your home base for your Aggieland weekend.",
      "actions": [
        "book_now"
      ]
    },
    "along_the_way": {
      "heading": "When you reach College Station",
      "sentence": "The miles end. Your weekend begins. Arrive at Texas A&M Hotel in the heart of campus.",
      "actions": [
        "book_now"
      ]
    },
    "game_weekend": {
      "sentence": "Check in. Settle in. Soak it all in. Make the hotel your College Station weekend home base.",
      "actions": [
        "book_now"
      ]
    },
    "game_day": {
      "sentence": "Just 96 yards from Kyle Field. Closer to the game. Right in the experience.",
      "actions": [
        "book_now"
      ]
    }
  },
  "links": {
    "book_now": "https://www.texasamhotelcc.com/"
  },
  "actionLabels": {
    "book_now": "Book Now"
  }
};

export function getDestinationArtworkCampaign(venueId) {
  return [culinaryGangsterTempe, texasAmHotelCollegeStation].find(campaign => partnerMatchesDestination(campaign, venueId)) || null;
}

export function selectDestinationArtwork(campaign, venueId, placement) {
  if (!partnerMatchesDestination(campaign, venueId)) return null;
  const creativeId = campaign.placements?.[placement];
  const creative = campaign.creatives?.[creativeId];
  const href = campaign.links?.[creative?.action];
  if (!creative || !href) return null;
  if (creative.allowedPlacements && !creative.allowedPlacements.includes(placement)) return null;
  try {
    const url = new URL(href);
    if (!["https:", "http:"].includes(url.protocol)) return null;
  } catch {
    return null;
  }
  return { creativeId, creative, href };
}
