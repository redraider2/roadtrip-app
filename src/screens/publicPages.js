// Shared by application navigation, sitemap generation, and publish notifications.
// Only independently addressable, canonical pages belong here (not #/journey screens).
export const SITE_ORIGIN = "https://www.kickoffmiles.com";
export const PUBLIC_PAGES = [
  {
    id: "home",
    label: "Home",
    path: "/",
    journeyScreen: true,
    title: "Kickoff Miles | College Football Road Trip Planner",
    description: "Plan a college football road trip: choose your team and game, map the drive, and find places to stay, eat, and visit. No account needed.",
    linkLabel: "Plan a college football road trip",
    contentSources: [
      "index.html",
      "src/App.jsx",
      "src/App.css",
      "src/index.css",
      "src/WarmJourney.css",
      "src/components/HomeExperience.jsx",
      "src/components/HomeFaq.jsx",
      "src/components/SampleTrip.jsx",
      "src/components/Header.jsx",
      "src/components/Background.jsx",
      "src/components/Background.css",
      "src/components/PlanningInformationLinks.jsx",
      "src/components/PlanningMainNavigation.jsx",
      "src/screens/publicPages.js",
      "src/screens/siteStructuredData.js",
      "src/data/homeFaq.js",
      "public/college-football-roadtrip-bg.webp",
      "public/kickoff-miles-logo.webp",
    ],
  },
  {
    id: "about",
    label: "About Kickoff Miles",
    path: "/about.html",
    linkLabel: "How Kickoff Miles works",
    title: "How Kickoff Miles works",
    description: "See how Kickoff Miles helps college football fans choose away games, plan driving routes, and find places to stay, eat, and visit.",
    component: "AboutKickoffMiles",
    cluster: "trip-planning",
    contentSources: ["src/components/AboutKickoffMiles.jsx", "src/App.css", "src/components/Header.jsx", "src/components/Background.jsx", "src/components/Background.css", "src/components/PlanningInformationLinks.jsx", "src/components/PlanningBreadcrumbs.jsx", "src/components/PlanningMainNavigation.jsx", "src/screens/publicPages.js", "scripts/generate-information-pages.mjs", "src/screens/siteStructuredData.js", "src/data/homeFaq.js", "public/kickoff-miles-logo.webp", "public/college-football-roadtrip-bg.webp"],
  },
  {
    id: "faq",
    label: "Trip planning FAQs",
    path: "/faq.html",
    linkLabel: "College football trip planning FAQs",
    title: "College football trip planning FAQs",
    description: "Read answers about planning without an account, using travel and schedule information, saving trips, and booking with providers.",
    component: "HomeFaq",
    cluster: "trip-planning",
    contentSources: ["src/components/HomeFaq.jsx", "src/App.css", "src/components/Header.jsx", "src/components/Background.jsx", "src/components/Background.css", "src/components/PlanningInformationLinks.jsx", "src/components/PlanningBreadcrumbs.jsx", "src/components/PlanningMainNavigation.jsx", "src/screens/publicPages.js", "scripts/generate-information-pages.mjs", "src/screens/siteStructuredData.js", "src/data/homeFaq.js", "public/kickoff-miles-logo.webp", "public/college-football-roadtrip-bg.webp"],
  },
  {
    id: "sample-trip",
    label: "Sample road trip",
    path: "/sample-trip.html",
    linkLabel: "See a Chicago-to-Tuscaloosa sample trip",
    title: "A sample college football road trip",
    description: "See a sample college football road trip from Chicago to Tuscaloosa, with driving estimates, an overnight plan, and local places to explore.",
    component: "SampleTrip",
    cluster: "trip-planning",
    contentSources: ["src/components/SampleTrip.jsx", "src/App.css", "src/components/Header.jsx", "src/components/Background.jsx", "src/components/Background.css", "src/components/PlanningInformationLinks.jsx", "src/components/PlanningBreadcrumbs.jsx", "src/components/PlanningMainNavigation.jsx", "src/screens/publicPages.js", "scripts/generate-information-pages.mjs", "src/screens/siteStructuredData.js", "src/data/homeFaq.js", "public/kickoff-miles-logo.webp", "public/college-football-roadtrip-bg.webp"],
  },
  {
    id: "planning-guides",
    label: "Trip planning guides",
    path: "/planning.html",
    linkLabel: "College football trip planning guides",
    title: "College football trip planning guides",
    description: "Explore college football trip planning guides: learn how Kickoff Miles works, find answers to common questions, and see a sample road trip.",
    component: "PlanningHub",
    cluster: "trip-planning",
    isHub: true,
    contentSources: ["src/components/PlanningHub.jsx", "src/App.css", "src/components/Header.jsx", "src/components/Background.jsx", "src/components/Background.css", "src/components/PlanningInformationLinks.jsx", "src/components/PlanningBreadcrumbs.jsx", "src/components/PlanningMainNavigation.jsx", "src/screens/publicPages.js", "scripts/generate-information-pages.mjs", "src/screens/siteStructuredData.js", "src/data/homeFaq.js", "public/kickoff-miles-logo.webp", "public/college-football-roadtrip-bg.webp"],
  },
];

export function getRelatedPublicPages(currentPath) {
  const current = PUBLIC_PAGES.find((page) => page.path === currentPath);
  if (!current?.cluster) return [];
  const cluster = PUBLIC_PAGES.filter((page) => page.cluster === current.cluster);
  const index = cluster.findIndex((page) => page.path === currentPath);
  // Deterministic cluster neighbors; wrapping preserves incoming links when
  // a cluster grows beyond five pieces. Never mix unrelated pages at random.
  return Array.from({ length: Math.min(5, cluster.length - 1) }, (_, offset) => cluster[(index + offset + 1) % cluster.length]);
}
