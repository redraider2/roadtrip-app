import { partnerMatchesDestination } from "./destinationAdvertising.js";

// User-supplied Nashville visitor recommendations, scoped to Vanderbilt's home venue.
export const visitMusicCity = {
  id: "visit_music_city_nashville",
  destinationVenueIds: ["3973"],
  businessName: "VisitMusicCity.com",
  tagline: "Come for the Commodores. Stay for Music City.",
  locationText: "Nashville · Vanderbilt game weekend",
  description: "Turn your Vanderbilt football trip into a Nashville weekend of great meals, live music, family adventures, and local discoveries.",
  websiteUrl: "https://www.visitmusiccity.com/",
  websiteLabel: "Explore Music City",
  isEditorial: true,
  editorialLabel: "Nashville Visitor Guide",
};

export const nashvilleCategories = [
  { id: "breakfast", title: "Where to Eat · Breakfast", items: ["The Butter Milk Ranch (Tuesday–Sunday)", "D’Andrews Bakery & Cafe", "The Loveless Cafe — Highway 100", "The Pancake Pantry — Hillsboro Village or Downtown"] },
  { id: "lunch", title: "Where to Eat · Lunch", items: ["Arnold’s Country Kitchen (Monday–Saturday lunch)", "Hot chicken at Prince’s Hot Chicken (choose a Nashville location)", "Hattie B’s Hot Chicken (choose a Nashville location)", "BBQ at Peg Leg Porker", "Martin’s Bar-B-Que Joint (choose a Nashville location)", "Shotgun Willie’s BBQ — Madison (Wednesday–Sunday; until sold out)", "San Antonio Taco Co.", "Midtown Cafe (weekday lunch; weekend brunch)", "etch — Nashville (weekday lunch)", "Bacco at Four Seasons Hotel Nashville"] },
  { id: "dinner", title: "Where to Eat · Dinner", items: ["Rolf & Daughters", "Sho Pizza Bar", "Noko (closed Mondays)", "Bastion restaurant (Wednesday–Saturday; reservations required)", "Chauhan Ale and Masala House", "The Twelve Thirty Club"] },
  { id: "activities", title: "Discover Music City", items: ["Grand Ole Opry", "Country Music Hall of Fame and Museum", "Historic RCA Studio B", "National Museum of African American Music", "Musicians Hall of Fame", "Ryman Auditorium", "Songwriter’s rounds at The Listening Room Cafe and Bluebird Cafe", "Zanies Comedy Club", "Third Man Records", "Carter Vintage Guitars"] },
  { id: "family", title: "Family Friendly Activities", items: ["Frist Art Museum", "Nashville Zoo", "The Parthenon", "Lane Motor Museum", "Adventure Science Center", "Professional sporting events: Nashville Predators, Tennessee Titans, Nashville Soccer Club, and Nashville Sounds", "Explore Centennial Park"] },
  { id: "coffee", title: "Coffee and Sweet Treats", items: ["8th and Roast", "Frothy Monkey", "Elegy Coffee", "Cupcake Collection", "Five Daughters Bakery", "Poppy & Peep", "Rolled 4 Ever Ice Cream"] },
  { id: "breweries", title: "Breweries and Distilleries", items: ["Tennessee Brew Works", "Jackalope", "Nelson’s Green Brier Distillery", "Ole Smoky Distillery", "Nashville Barrel Co"] },
  { id: "nightlife", title: "Music City Night Life", items: ["Live music on Lower Broadway and Honky Tonk Highway", "Printer’s Alley", "Losers Bar & Grill", "The Fox Bar and Cocktail Club", "Odie’s", "Santa's Pub", "Live music at one of the city’s independent music venues"] },
  { id: "shopping", title: "Shopping", items: ["Green Hills Mall", "Imogene + willie", "ABLE", "White's Mercantile", "Judith Bright", "Ranger Station", "Grimey’s"] },
  { id: "gameday", title: "Gameday at Vanderbilt", items: ["Breakfast at Brown’s Diner", "Lunch at Greenery Co. or Red’s Hot Chicken", "Tailgate at Vandyville", "Watch the Commodores Win!"] },
];

const placements = {
  trip_hq: { title: "Start Your Music City Weekend", categories: ["breakfast", "activities"] },
  route_schedule: { title: "Nashville Is Waiting", categories: [] },
  along_the_way: { title: "When You Reach Nashville", categories: ["lunch", "coffee"] },
  stay_itinerary: { title: "Make More of Your Nashville Stay", categories: ["dinner", "family", "shopping"] },
  drive: { title: "Your Nashville Arrival Break", categories: ["coffee"] },
  game_weekend: { title: "Your Music City Weekend Guide", categories: ["breakfast", "lunch", "dinner", "activities", "family", "coffee", "breweries", "nightlife", "shopping"] },
  game_day: { title: "Your Vanderbilt Gameday Playbook", categories: ["gameday"] },
  destination: { title: "Nashville for Your Vanderbilt Weekend", categories: nashvilleCategories.map(({ id }) => id) },
};

export function getNashvilleRecommendations(venueId, placement) {
  if (!partnerMatchesDestination(visitMusicCity, venueId) || !placements[placement]) return null;
  const config = placements[placement];
  return { title: config.title, categories: config.categories.map((id) => nashvilleCategories.find((category) => category.id === id)) };
}
