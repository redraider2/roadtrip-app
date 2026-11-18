// Shared by application navigation, sitemap generation, and publish notifications.
// Only independently addressable, canonical pages belong here (not #/journey screens).
export const SITE_ORIGIN = "https://www.kickoffmiles.com";
export const PUBLIC_PAGES = [
  {
    id: "home",
    label: "Home",
    path: "/",
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
      "public/college-football-roadtrip-bg.png",
      "public/kickoff-miles-logo.png",
    ],
  },
];
