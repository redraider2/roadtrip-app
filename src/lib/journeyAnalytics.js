import { analytics } from "@heycatch/sdk";

// One controller per mounted application. Only allowlisted, public football
// metadata and aggregate counts leave this module. Never pass trip titles,
// notes, starting locations, coordinates, auth tokens, or account details.
export function createJourneyAnalytics(trackEvent = analytics.trackEvent) {
  let selectedTeam = null;
  let selectedGame = null;
  let pendingRoute = null;
  const savedTrips = new Set();
  const publicId = (value) => /^(?:[a-zA-Z0-9_-]){1,80}$/.test(String(value ?? "")) ? String(value) : undefined;
  const tripKey = (trip) => trip?.id == null ? "preview" : String(trip.id);
  const send = (event, properties) => {
    try {
      trackEvent(event, Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined)));
    } catch {
      // Analytics must never interrupt selection, routing, or persistence.
    }
  };

  return {
    teamSelected(team, season) {
      if (!team?.school) return;
      const key = `${season}:${team.school}`;
      if (key === selectedTeam) return;
      selectedTeam = key;
      selectedGame = null;
      send("team_selected", { team_id: publicId(team.id), team_name: team.school, season });
    },
    gameSelected(game, season) {
      if (!game?.id || !game.awayTeam || !game.homeTeam) return;
      const key = `${season}:${game.id}`;
      if (key === selectedGame) return;
      selectedGame = key;
      send("away_game_selected", {
        game_id: publicId(game.id), away_team: game.awayTeam,
        home_team: game.homeTeam, venue_id: publicId(game.venueId), season,
      });
    },
    resetSelection() {
      selectedTeam = null;
      selectedGame = null;
      pendingRoute = null;
    },
    beginRoute(trip, tripType) {
      pendingRoute = { key: tripKey(trip), tripType, planningMode: trip?.id == null ? "preview" : "saved" };
    },
    routeCreated(trip, route, stopCount) {
      if (!pendingRoute || pendingRoute.key !== tripKey(trip)) return;
      if (!Array.isArray(route?.geometry) || route.geometry.length < 2 ||
          !route.geometry.every((point) => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite)) ||
          !Number.isFinite(route.distanceMeters) || route.distanceMeters <= 0 ||
          !Number.isFinite(route.durationSeconds) || route.durationSeconds <= 0) return;
      const { tripType, planningMode } = pendingRoute;
      pendingRoute = null; // Effects/recalculations/reopening must not repeat the outcome.
      send("route_created", {
        trip_type: tripType, planning_mode: planningMode,
        distance_miles: Math.round(route.distanceMeters / 1609.344),
        drive_minutes: Math.round(route.durationSeconds / 60),
        route_stop_count: stopCount,
      });
    },
    tripSaved(trip, tripType, venueId) {
      const id = Number(trip?.id);
      if (!Number.isSafeInteger(id) || id <= 0 || savedTrips.has(id)) return;
      savedTrips.add(id);
      send("trip_saved", { trip_type: tripType, venue_id: publicId(venueId), persistence: "server" });
    },
  };
}
