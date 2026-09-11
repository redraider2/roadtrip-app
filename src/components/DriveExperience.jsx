import PartnerPlacement from "./PartnerPlacement.jsx";
import PartnerFieldTestReport from "./PartnerFieldTestReport.jsx";
import TripMap from "./TripMap.jsx";
import LiveJourneyPanel from "./LiveJourneyPanel.jsx";
import { formatGameDate } from "../lib/formatters.js";

const VENUE_NAME_OVERRIDES = new Map([
  ["3784", "Galaxy Stadium"],
]);

function normalizeVenueName(value, venueId) {
  const override = VENUE_NAME_OVERRIDES.get(String(venueId || ""));
  if (override) return override;
  return value || "";
}

function normalizeDestination(value, venueId) {
  const override = VENUE_NAME_OVERRIDES.get(String(venueId || ""));
  if (!override || !value) return value;

  return value.replace(/^Jones AT&T Stadium/i, override);
}

function savedGameDate(notes) {
  const value = String(notes || "").trim();
  if (!value) return "";

  const parts = value.split(" · ").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  const savedDate = parts.length > 1 ? parts.slice(0, -1).join(" · ") : parts[0];
  return savedDate && savedDate !== "Game date unavailable" ? savedDate : "";
}

function directionsUrl(place) {
  const latitude = Number(place?.latitude);
  const longitude = Number(place?.longitude);
  const query =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude},${longitude}`
      : place?.address || place?.name;

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function DriveStop({ label, place }) {
  if (!place) return null;

  const directions = directionsUrl(place);

  return (
    <li className="drive-stop">
      <span className="drive-stop-type">{label}</span>
      <div className="drive-stop-copy">
        <strong>{place.name}</strong>
        {place.address ? <span>{place.address}</span> : null}
      </div>
      <div className="drive-stop-actions">
        {directions ? (
          <a href={directions} target="_blank" rel="noreferrer">
            Directions
          </a>
        ) : null}
        {place.website ? (
          <a href={place.website} target="_blank" rel="noreferrer">
            Website
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default function DriveExperience({
  currentDay,
  game,
  onArrive,
  onBack,
  partner,
  routeGeometry,
  stops,
  travelDayCount,
  trip,
  tripStats,
  alongTheWay,
  apiBaseUrl,
}) {
  const venueId = game?.venueId || trip?.venueId;
  const displayDestination = normalizeDestination(trip.end, venueId);
  const displayVenue = normalizeVenueName(game?.venue, venueId);
  const displayGameDate = game
    ? formatGameDate(game.startDate, game.startTimeTBD)
    : savedGameDate(trip.notes) || "Game date unavailable";
  const plannedDestination = currentDay?.hotel?.name || displayDestination;
  const savedStops = stops.filter((stop) => stop.is_route_stop === false);
  const mapStops = [
    ...stops,
    currentDay?.restaurant,
    currentDay?.historic,
    currentDay?.hotel,
  ].filter(
    (place, index, places) =>
      place &&
      places.findIndex((candidate) => String(candidate?.id) === String(place.id)) === index
  );
  const showFieldTestReport =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("fieldTest") === "1";

  return (
    <section className="drive-experience" aria-labelledby="drive-title">
      <header className="drive-header">
        <button type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Trip HQ
        </button>
        <span>Kickoff Miles</span>
      </header>

      <div className="drive-intro">
        <div>
          <span className="drive-kicker">The trip is underway</span>
          <h1 id="drive-title">You’re on the road</h1>
          <p>Follow your trip and discover useful stops along the way.</p>
        </div>

        <div className="drive-trip-identity">
          <strong>
            {game ? `${game.awayTeam} @ ${game.homeTeam}` : trip.name || trip.title}
          </strong>
          <span>{trip.start} → {displayDestination}</span>
          <span>
            {displayGameDate}
            {displayVenue ? ` · ${displayVenue}` : ""}
          </span>
        </div>
      </div>

      <LiveJourneyPanel
        key={trip.id}
        routeGeometry={routeGeometry}
        tripStats={tripStats}
        alongTheWay={alongTheWay}
        apiBaseUrl={apiBaseUrl}
        onArrive={onArrive}
        partner={partner}
        destination={displayDestination}
      />

      <div className="drive-overview" aria-label="Planned drive overview">
        <div><span>Total distance</span><strong>{tripStats?.distance || "Calculating…"}</strong></div>
        <div><span>Total drive time</span><strong>{tripStats?.driveTime || "Calculating…"}</strong></div>
        <div><span>Planned travel day</span><strong>Day 1 of {travelDayCount}</strong></div>
      </div>

      <div className="drive-map-layout">
        <div className="drive-map-hero">
          <div className="drive-map-heading">
            <span className="drive-kicker">Your route</span>
            <h2>{trip.start} → {displayDestination}</h2>
          </div>
          <TripMap
            start={trip.start}
            end={trip.end}
            stops={mapStops}
            routeGeometry={routeGeometry}
          />
        </div>

        <aside className="drive-today">
          <span className="drive-kicker">Planned day 1</span>
          <h2>Today’s Drive</h2>
          <div className="drive-today-route">
            <div><span>Start</span><strong>{trip.start}</strong></div>
            <i aria-hidden="true">↓</i>
            <div><span>{currentDay?.hotel ? "Overnight" : "Destination"}</span><strong>{plannedDestination}</strong></div>
          </div>

          <ul className="drive-today-stops">
            <DriveStop label="Food" place={currentDay?.restaurant} />
            <DriveStop label="Stop" place={currentDay?.historic} />
            <DriveStop label="Overnight" place={currentDay?.hotel} />
          </ul>

          {!currentDay?.restaurant && !currentDay?.historic && !currentDay?.hotel ? (
            <p className="drive-empty">No suggested stops are assigned to this travel day yet.</p>
          ) : null}
        </aside>
      </div>

      <PartnerPlacement
        contextLabel="On the Road"
        partner={partner}
      />

      {showFieldTestReport ? (
        <PartnerFieldTestReport partner={partner} venueId={venueId} />
      ) : null}

      <div className="drive-lower-grid">
        <section className="drive-saved-stops" aria-labelledby="drive-stops-title">
          <span className="drive-kicker">Ready when you need them</span>
          <h2 id="drive-stops-title">Road-trip stops</h2>
          {savedStops.length > 0 ? (
            <ul>
              {savedStops.map((stop) => (
                <DriveStop
                  key={stop.id}
                  label={stop.location_type || "Saved"}
                  place={stop}
                />
              ))}
            </ul>
          ) : (
            <p className="drive-empty">No additional saved places are attached to this trip.</p>
          )}
        </section>

        <section className="drive-arrival">
          <span className="drive-kicker">Next destination</span>
          <h2>Arrive at {displayVenue || displayDestination}</h2>
          <p>When the drive is complete, shift from the road to the destination.</p>
          <button type="button" onClick={onArrive}>
            Explore Game Weekend <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
    </section>
  );
}
