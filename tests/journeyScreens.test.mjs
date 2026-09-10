import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getJourneyHash,
  JOURNEY_SCREENS,
  parseJourneyHash,
} from "../src/screens/journeyArchitecture.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const boundarySource = await readFile(
  new URL("../src/screens/JourneyScreens.jsx", import.meta.url),
  "utf8"
);
const homeSource = await readFile(
  new URL("../src/components/HomeExperience.jsx", import.meta.url),
  "utf8"
);
const chooseTeamSource = await readFile(
  new URL("../src/components/ChooseTeamExperience.jsx", import.meta.url),
  "utf8"
);
const chooseGameSource = await readFile(
  new URL("../src/components/ChooseGameExperience.jsx", import.meta.url),
  "utf8"
);
const tripHqSource = await readFile(
  new URL("../src/components/TripHqExperience.jsx", import.meta.url),
  "utf8"
);
const driveSource = await readFile(
  new URL("../src/components/DriveExperience.jsx", import.meta.url),
  "utf8"
);
const destinationMapSource = await readFile(
  new URL("../src/components/DestinationMap.jsx", import.meta.url),
  "utf8"
);
const planWorkspaceSource = await readFile(
  new URL("../src/components/PlanWorkspace.jsx", import.meta.url),
  "utf8"
);
const partnerPlacementSource = await readFile(
  new URL("../src/components/PartnerPlacement.jsx", import.meta.url),
  "utf8"
);
const navigationSource = await readFile(
  new URL("../src/screens/useJourneyNavigation.js", import.meta.url),
  "utf8"
);
const appCssSource = await readFile(
  new URL("../src/App.css", import.meta.url),
  "utf8"
);

test("approved journey screen order remains explicit", () => {
  assert.deepEqual(
    JOURNEY_SCREENS.map((screen) => screen.id),
    [
      "home",
      "choose-team",
      "choose-game",
      "trip-hq",
      "plan-route-schedule",
      "plan-along-the-way",
      "plan-stay-itinerary",
      "drive",
      "game-weekend",
      "game-day",
    ]
  );
});

test("all approved screen components are present in App", () => {
  const componentNames = [
    "HomeScreen",
    "ChooseTeamScreen",
    "ChooseGameScreen",
    "TripHqScreen",
    "PlanRouteScheduleScreen",
    "PlanAlongTheWayScreen",
    "PlanStayItineraryScreen",
    "DriveScreen",
    "GameWeekendScreen",
    "GameDayScreen",
  ];

  for (const componentName of componentNames) {
    assert.ok(boundarySource.includes(`function ${componentName}`));
    assert.ok(appSource.includes(`<${componentName}`));
  }
});

test("screen boundaries remain DOM-neutral while routing controls visibility", () => {
  assert.ok(
    boundarySource.includes("<Fragment>{active ? children ?? null : null}</Fragment>")
  );
  assert.ok(!boundarySource.includes("className="));
});

test("Drive is an active route-gated journey boundary", () => {
  assert.equal(
    JOURNEY_SCREENS.find((screen) => screen.id === "drive")?.status,
    "active-boundary"
  );
  assert.ok(appSource.includes('activeScreen === "drive"'));
  assert.ok(appSource.includes("activeTrip && hasRoute"));
  assert.ok(appSource.includes("<DriveScreen active>"));
  assert.ok(appSource.includes("<DriveExperience"));
});

test("journey hashes support deep links and reject unknown screens", () => {
  assert.equal(parseJourneyHash("#/plan-along-the-way"), "plan-along-the-way");
  assert.equal(parseJourneyHash("#game-day"), "game-day");
  assert.equal(parseJourneyHash("#/unknown"), "home");
  assert.equal(parseJourneyHash(""), "home");
  assert.equal(getJourneyHash("trip-hq"), "#/trip-hq");
  assert.equal(getJourneyHash("unknown"), "#/home");
});

test("Home presents one primary journey action", () => {
  assert.ok(homeSource.includes('<span className="home-headline-line home-headline-line-one">'));
  assert.ok(homeSource.includes("<span>Let&rsquo;s</span>"));
  assert.ok(homeSource.includes("<span>Hit</span>"));
  assert.ok(homeSource.includes('<span className="home-headline-line">The Road!</span>'));
  assert.ok(appCssSource.includes("gap: clamp(0.28em, 1.6vw, 0.42em)"));
  assert.ok(homeSource.includes("Pick your team. Choose a game. Build the road trip."));
  assert.ok(homeSource.includes("Choose Your Team"));
  assert.ok(homeSource.includes("onClick={onChooseTeam}"));
  assert.ok(appSource.includes('onChooseTeam={() => navigateTo("choose-team")}'));
});

test("Home cinematic composition excludes the former hero cards", () => {
  assert.ok(!homeSource.includes("home-destination-card"));
  assert.ok(!homeSource.includes("Road → Stadium"));
  assert.ok(!homeSource.includes("home-journey-cues"));
  assert.ok(homeSource.includes('<details className="home-account-access">'));
});

test("ten-item journey navigation is hidden where contextual navigation exists", () => {
  assert.ok(appSource.includes("!isPlanScreen"));
  assert.ok(appSource.includes("<JourneyNavigation"));
  assert.ok(appSource.includes("<HomeExperience"));
});

test("PLAN screens share contextual navigation and compact trip identity", () => {
  assert.ok(planWorkspaceSource.includes("Plan Your Road Trip"));
  assert.ok(planWorkspaceSource.includes("Trip HQ"));
  assert.ok(planWorkspaceSource.includes("Route & Schedule"));
  assert.ok(planWorkspaceSource.includes("Along the Way"));
  assert.ok(planWorkspaceSource.includes("Stay & Itinerary"));
  assert.ok(planWorkspaceSource.includes("game.awayTeam"));
  assert.ok(planWorkspaceSource.includes("shortLocation(trip.start)"));
  assert.ok(appSource.includes("<PlanWorkspace"));
});

test("PLAN tabs preserve hash routes and browser-history behavior", () => {
  assert.ok(planWorkspaceSource.includes("onNavigate(tab.id)"));
  assert.ok(navigationSource.includes("window.history.pushState"));
  assert.ok(navigationSource.includes('window.addEventListener("popstate"'));
  assert.equal(getJourneyHash("plan-route-schedule"), "#/plan-route-schedule");
  assert.equal(getJourneyHash("plan-along-the-way"), "#/plan-along-the-way");
  assert.equal(getJourneyHash("plan-stay-itinerary"), "#/plan-stay-itinerary");
});

test("Route & Schedule retains the existing route map, geometry, stops, and statistics", () => {
  assert.ok(appSource.includes('className="plan-route-map"'));
  assert.ok(appSource.includes("routeGeometry={routeGeometry}"));
  assert.ok(appSource.includes("stop.is_route_stop !== false"));
  assert.ok(appSource.includes("tripStats?.distance"));
  assert.ok(appSource.includes("tripStats?.driveTime"));
  assert.ok(appSource.includes("overnightTargets.length + 1"));
});

test("PLAN recommendations and itinerary retain Save to Trip behavior", () => {
  assert.ok(appSource.includes("Food Worth Stopping For"));
  assert.ok(appSource.includes("Overnight Options"));
  assert.ok(appSource.includes("Historic & Interesting"));
  assert.ok(appSource.includes("plan-itinerary-timeline"));
  assert.ok(appSource.includes('addSuggestedStop(place, "restaurant")'));
  assert.ok(appSource.includes('addSuggestedStop(place, "hotel")'));
  assert.ok(appSource.includes('addSuggestedStop(place, "historic")'));
  assert.ok(appSource.includes('addSuggestedStop(day.restaurant, "restaurant")'));
});

test("commercial placements are labeled, data-driven, and absent without partner data", () => {
  assert.ok(partnerPlacementSource.includes("if (!partner) return null"));
  assert.ok(partnerPlacementSource.includes('featured: "Featured Partner"'));
  assert.ok(partnerPlacementSource.includes('sponsored: "Sponsored"'));
  assert.ok(partnerPlacementSource.includes('offer: "Kickoff Miles Offer"'));
  assert.ok(partnerPlacementSource.includes('destination: "Destination Partner"'));
  assert.ok(partnerPlacementSource.includes("partner.businessName"));
  assert.ok(!partnerPlacementSource.includes("Spanky"));
  assert.ok(appSource.includes("featuredPartner ||"));
});

test("partner visual-QA sample is limited to development workspace placements", () => {
  assert.ok(appSource.includes("DEVELOPMENT_PARTNER_PREVIEW"));
  assert.ok(appSource.includes("import.meta.env.DEV ? DEVELOPMENT_PARTNER_PREVIEW : null"));
  assert.ok(appSource.includes("partner={workspacePartner}"));
  assert.ok(appSource.includes("featuredPartner ||"));
  assert.ok(appSource.includes("Development-only placement preview"));
});

test("Home excludes custom-trip and saved-trip management", () => {
  assert.ok(!homeSource.includes("Return to saved trips"));
  assert.ok(!homeSource.includes("Saved Trips"));
  assert.ok(!homeSource.includes("Create a Custom Trip"));
  assert.ok(
    appSource.includes(
      "Preserved for later placement in the authenticated Trip HQ experience."
    )
  );
  assert.ok(appSource.includes("<TripHqScreen active={false}>") );
});

test("Choose Team uses existing team data with visual search and logos", () => {
  assert.ok(chooseTeamSource.includes("Choose Your Team"));
  assert.ok(chooseTeamSource.includes("Who are we hitting the road for?"));
  assert.ok(chooseTeamSource.includes('type="search"'));
  assert.ok(chooseTeamSource.includes("team.logos?.[0]"));
  assert.ok(chooseTeamSource.includes("teams.filter"));
  assert.ok(appSource.includes("teams={footballTeams}"));
});

test("Choose Team retains contextual routing and automatic advancement", () => {
  assert.ok(appSource.includes('onBack={() => navigateTo("home")}'));
  assert.ok(appSource.includes("setSelectedFootballTeam(school)"));
  assert.ok(appSource.includes('navigateTo("choose-game")'));
});

test("Choose Game presents existing games as destination choices", () => {
  assert.ok(chooseGameSource.includes("Choose Your Game"));
  assert.ok(chooseGameSource.includes("Where are we going?"));
  assert.ok(chooseGameSource.includes("Pick the away game worth hitting the road for."));
  assert.ok(chooseGameSource.includes("game.venue || \"Venue to be announced\""));
  assert.ok(chooseGameSource.includes("formatGameDate(game.startDate, game.startTimeTBD)"));
  assert.ok(chooseGameSource.includes("team?.logos?.[0]"));
});

test("Choose Game retains selected ID, trip inputs, submit, and back behavior", () => {
  assert.ok(chooseGameSource.includes("onSelectGame(String(game.id))"));
  assert.ok(chooseGameSource.includes('type="submit"'));
  assert.ok(appSource.includes("onSelectGame={setSelectedFootballGameId}"));
  assert.ok(appSource.includes("onStartChange={setFootballStart}"));
  assert.ok(appSource.includes("onDailyDriveHoursChange={setDailyDriveHours}"));
  assert.ok(appSource.includes('onBack={() => navigateTo("choose-team")}'));
});

test("Trip HQ presents route identity, statistics, and contextual gateways", () => {
  assert.ok(tripHqSource.includes("Your road trip headquarters"));
  assert.ok(tripHqSource.includes("Starting point"));
  assert.ok(tripHqSource.includes("Game destination"));
  assert.ok(tripHqSource.includes("tripStats?.distance"));
  assert.ok(tripHqSource.includes("tripStats?.driveTime"));
  assert.ok(tripHqSource.includes("Route & Schedule"));
  assert.ok(tripHqSource.includes("Along the Way"));
  assert.ok(tripHqSource.includes("Stay & Itinerary"));
  assert.ok(tripHqSource.includes("Game Weekend"));
  assert.ok(tripHqSource.includes("Game Day"));
});

test("Trip HQ opens Drive when route data is ready and preserves the workspace", () => {
  assert.ok(tripHqSource.includes("<strong>Drive</strong>"));
  assert.ok(tripHqSource.includes("disabled={!hasDrive}"));
  assert.ok(tripHqSource.includes('onNavigate("drive")'));
  assert.ok(appSource.includes("hasDrive={hasRoute}"));
  assert.ok(appSource.includes("<TripMap"));
  assert.ok(appSource.includes("handleAddStop"));
  assert.ok(appSource.includes("setStopRouteStatus"));
  assert.ok(appSource.includes("moveStop"));
  assert.ok(appSource.includes("deleteStop"));
});

test("Drive presents the planned route, day-one stops, and destination handoff", () => {
  assert.ok(driveSource.includes("This is your planned route—not live vehicle navigation."));
  assert.ok(driveSource.includes("routeGeometry={routeGeometry}"));
  assert.ok(driveSource.includes("currentDay?.restaurant"));
  assert.ok(driveSource.includes("currentDay?.historic"));
  assert.ok(driveSource.includes("currentDay?.hotel"));
  assert.ok(driveSource.includes("<PartnerPlacement"));
  assert.ok(driveSource.includes("onClick={onArrive}"));
  assert.ok(appSource.includes('onArrive={() => navigateTo("game-weekend")}'));
});

test("Trip HQ workspace retains its map, summary, and itinerary controls in a wide dashboard", () => {
  assert.ok(appSource.includes('className="panel trip-workspace-panel"'));
  assert.ok(appSource.includes('className="trip-map-section"'));
  assert.ok(appSource.includes('className="trip-summary-section"'));
  assert.ok(appSource.includes('className="trip-stops-section"'));
  assert.ok(appSource.includes("handleAddStop"));
  assert.ok(appSource.includes("deleteTrip(activeTrip.id)"));
  assert.ok(appCssSource.includes(".app.is-trip-hq .trip-workspace-panel"));
  assert.ok(
    appCssSource.includes(
      "grid-template-columns: minmax(0, 1.5fr) minmax(340px, 0.9fr)"
    )
  );
  assert.ok(appCssSource.includes("height: 720px"));
  assert.ok(appCssSource.includes("@media (max-width: 900px)"));
  assert.ok(appCssSource.includes("@media (max-width: 600px)"));
});

test("Game Weekend independently mounts its existing map and venue-place content", () => {
  assert.ok(
    appSource.includes(
      '<GameWeekendScreen active={activeScreen === "game-weekend"}>'
    )
  );
  assert.ok(appSource.includes("<DestinationMap"));
  assert.ok(appSource.includes("restaurants={weekendPlaces.restaurant}"));
  assert.ok(appSource.includes("bars={weekendPlaces.bar}"));
  assert.ok(appSource.includes("hotels={weekendPlaces.hotel}"));
  assert.ok(appSource.includes("🍴 Game Day Eats"));
  assert.ok(appSource.includes("🍺 Fan Bars"));
  assert.ok(appSource.includes("🛏 Stay Near the Stadium"));
});

test("Game Weekend map retains a mounted Leaflet container and destination markers", () => {
  assert.ok(destinationMapSource.includes("<MapContainer"));
  assert.ok(destinationMapSource.includes('className="destination-map"'));
  assert.ok(destinationMapSource.includes("<FitDestinationBounds"));
  assert.ok(destinationMapSource.includes("places.map((place)"));
});

test("Game Day independently mounts all existing guide sections and source links", () => {
  assert.ok(
    appSource.includes('<GameDayScreen active={activeScreen === "game-day"}>')
  );

  for (const section of [
    'current === "tailgating"',
    'current === "parkingArrival"',
    'current === "knowBeforeYouGo"',
    'current === "traditions"',
  ]) {
    assert.ok(appSource.includes(section), section);
  }

  assert.ok(appSource.includes("gameDayGuide.tailgating?.where"));
  assert.ok(appSource.includes("gameDayGuide.tailgating?.arrival"));
  assert.ok(appSource.includes("gameDayGuide.tailgating?.rules"));
  assert.ok(appSource.includes("gameDayGuide.tailgating?.visitors"));
  assert.ok(appSource.includes("gameDayGuide[openGameDaySection]?.sourceUrl"));
});

test("Game Weekend and Game Day retain game-level venue precedence and fetch paths", () => {
  assert.ok(appSource.includes("selectedFootballGame?.venueId || activeTrip?.venueId"));

  for (const path of [
    "/football/venues/${venueId}/places?category=restaurant",
    "/football/venues/${venueId}/places?category=bar",
    "/football/venues/${venueId}/places?category=hotel",
    "/football/venues/${venueId}/game-day-guide",
  ]) {
    assert.ok(appSource.includes(path), path);
  }
});
