import PartnerPlacement from "./PartnerPlacement.jsx";
import TripMap from "./TripMap.jsx";
import { formatGameDate } from "../lib/formatters.js";

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
}) {
  const plannedDestination = currentDay?.hotel?.name || trip.end;
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
          <p>This is your planned route—not live vehicle navigation.</p>
        </div>

        <div className="drive-trip-identity">
          <strong>
            {game ? `${game.awayTeam} @ ${game.homeTeam}` : trip.name || trip.title}
          </strong>
          <span>{trip.start} → {trip.end}</span>
          <span>
            {game ? formatGameDate(game.startDate, game.startTimeTBD) : "Game date unavailable"}
            {game?.venue ? ` · ${game.venue}` : ""}
          </span>
        </div>
      </div>

      <div className="drive-overview" aria-label="Drive overview">
        <div><span>Total distance</span><strong>{tripStats?.distance || "Calculating…"}</strong></div>
        <div><span>Total drive time</span><strong>{tripStats?.driveTime || "Calculating…"}</strong></div>
        <div><span>Planned travel day</span><strong>Day 1 of {travelDayCount}</strong></div>
      </div>

      <div className="drive-map-layout">
        <div className="drive-map-hero">
          <div className="drive-map-heading">
            <span className="drive-kicker">Your route</span>
            <h2>{trip.start} → {trip.end}</h2>
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
          <h2>Arrive at {game?.venue || trip.end}</h2>
          <p>When the drive is complete, shift from the road to the destination.</p>
          <button type="button" onClick={onArrive}>
            Explore Game Weekend <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
    </section>
  );
}
