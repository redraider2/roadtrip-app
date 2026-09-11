import { useEffect, useMemo, useState } from "react";
import PartnerPlacement from "./PartnerPlacement.jsx";
import { buildLiveJourney, MILE_METERS, prepareRoute, recommendAhead, upcomingGeometry, watchJourneyLocation } from "../lib/liveJourney.js";
import { formatRouteDuration } from "../lib/formatters.js";

const PHASES = { departing: "Getting underway", en_route: "On the road", approaching_destination: "Approaching your destination", arrived: "You’re near your destination", off_route: "Away from the planned route" };

function destinationCity(destination) {
  const value = String(destination || "").trim();
  if (!value) return "YOUR DESTINATION";

  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2].toUpperCase();
  return parts[0].toUpperCase();
}

export default function LiveJourneyPanel({ routeGeometry, tripStats, alongTheWay, apiBaseUrl, onArrive, partner, destination }) {
  const [enabled, setEnabled] = useState(false);
  const [fix, setFix] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [results, setResults] = useState(null);
  const route = useMemo(() => prepareRoute(routeGeometry), [routeGeometry]);
  const journey = enabled ? buildLiveJourney(fix, route, tripStats?.durationSeconds, now) : null;
  const bucket = journey && !["off_route", "arrived"].includes(journey.phase)
    ? Math.floor(journey.traveledMeters / (10 * MILE_METERS)) : -1;

  useEffect(() => {
    if (!enabled) return;
    let stop = () => {};
    const subscribe = () => {
      stop();
      setFix(null);
      if (document.visibilityState === "hidden") return;
      stop = watchJourneyLocation(navigator.geolocation, (position) => {
        setNow(Date.now());
        setFix(position);
        setError("");
      }, (message) => { setError(message); setFix(null); setEnabled(false); });
    };
    subscribe();
    document.addEventListener("visibilitychange", subscribe);
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => { stop(); window.clearInterval(timer); document.removeEventListener("visibilitychange", subscribe); };
  }, [enabled]);

  // Refresh the upcoming corridor every ten miles, rather than calling Places for every GPS fix.
  useEffect(() => {
    if (bucket < 0 || !route) return;
    const controller = new AbortController();
    let cancelled = false;
    const startMeters = bucket * 10 * MILE_METERS;
    let segment = route.cumulative.findIndex((value) => value >= startMeters) - 1;
    segment = Math.max(0, Math.min(route.geometry.length - 2, segment));
    const geometry = upcomingGeometry(route, {
      projected: route.geometry[segment], segment, traveledMeters: startMeters, phase: "en_route",
    }, 70);
    async function load() {
      const categories = ["restaurant", "historic", "hotel"];
      const settled = await Promise.allSettled(categories.map(async (category) => {
        const response = await fetch(`${apiBaseUrl}/football/along-the-way`, {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geometry, category }),
        });
        if (!response.ok) throw new Error("Nearby search failed");
        const data = await response.json();
        return (data.places || []).map((place) => ({ ...place, category }));
      }));
      if (!cancelled) setResults({ route, bucket,
        places: settled.flatMap((result) => result.status === "fulfilled" ? result.value : []),
        failed: settled.some((result) => result.status === "rejected"),
      });
    }
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [bucket, route, apiBaseUrl]);

  const loaded = results?.route === route && results?.bucket === bucket;
  const planned = Object.entries(alongTheWay || {}).flatMap(([category, places]) =>
    places.map((place) => ({ ...place, category })));
  const suggestions = recommendAhead([...(loaded ? results.places : []), ...planned], route, journey, new Date(now).getHours());
  const start = () => { setFix(null); setError(""); setNow(Date.now()); setEnabled(true); };
  const stop = () => { setEnabled(false); setFix(null); };
  const reliable = journey && journey.phase !== "off_route";
  const showArrivalPartner = reliable && partner && ["approaching_destination", "arrived"].includes(journey.phase);
  const minutesRemaining = journey?.remainingSeconds === null || journey?.remainingSeconds === undefined
    ? null
    : Math.max(0, Math.round(journey.remainingSeconds / 60));
  const arrivalContext = journey?.phase === "arrived"
    ? `WELCOME TO ${destinationCity(destination)}`
    : minutesRemaining === null
      ? `APPROACHING ${destinationCity(destination)}`
      : `${minutesRemaining} MINUTES TO ${destinationCity(destination)}`;

  return (
    <section className="live-journey" aria-labelledby="live-journey-title">
      <div className="live-journey-heading">
        <div><span className="drive-kicker">Along the way · Live</span><h2 id="live-journey-title">Your journey, as it happens</h2></div>
        <button type="button" onClick={enabled ? stop : start} disabled={!route}>
          {enabled ? "Stop location sharing" : "Start live journey"}
        </button>
      </div>
      <p>Share your location while Drive is open to see progress and useful stops ahead. Your GPS position isn’t saved. Nearby searches use the upcoming section of your planned route. Tracking pauses when you hide the app.</p>
      <div role="status">
        {error ? <p>{error}</p> : !enabled ? <p>Start when you’re ready. Your planned route is available below.</p> :
          !fix ? <p>Waiting for your location…</p> : !journey ? <p>Waiting for a fresh, more accurate location. Live estimates are paused.</p> :
            <p><strong>{PHASES[journey.phase]}</strong>{journey.phase === "off_route" ? " · Progress and suggestions are paused until you return to the planned route." : ""}</p>}
      </div>
      {reliable ? <>
        <progress max="100" value={journey.progress * 100} aria-label="Trip progress" />
        <div className="live-journey-stats">
          <div><span>Complete</span><strong>{Math.round(journey.progress * 100)}%</strong></div>
          <div><span>Miles remaining</span><strong>{Math.round(journey.remainingMeters / MILE_METERS)}</strong></div>
          <div><span>Estimated drive left</span><strong>{journey.remainingSeconds === null ? "Unavailable" : formatRouteDuration(journey.remainingSeconds)}</strong></div>
          <div><span>Estimated arrival</span><strong>{journey.eta === null ? "Unavailable" : new Date(journey.eta).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong></div>
        </div>
        <p className="live-journey-note">Updated {new Date(fix.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Estimates use your planned route’s average pace and exclude stops and live traffic. Times use your device’s time zone.</p>
        {showArrivalPartner ? (
          <PartnerPlacement
            contextLabel={arrivalContext}
            partner={partner}
            type="destination"
          />
        ) : null}
        {journey.phase === "arrived" ? <button type="button" onClick={onArrive}>Explore Game Weekend</button> : <>
          <h3>Coming up on your route</h3>
          {!loaded ? <p>Checking places ahead…</p> : results.failed ? <p>Some searches couldn’t load. Showing available suggestions.</p> : null}
          {suggestions.length ? <ul className="live-suggestions">{suggestions.map((place) => (
            <li key={place.id || `${place.name}:${place.latitude}:${place.longitude}`}>
              <div><span className="drive-kicker">{place.category === "historic" ? "Explore" : place.category === "hotel" ? "Stay" : "Food"}</span><h4>{place.name}</h4>
                <p>{place.reason} · {Math.round(place.aheadMiles)} miles ahead</p>
                <p>{place.routeOffsetMiles.toFixed(1)} miles from route (straight-line distance)</p>
                {place.rating ? <p>Rating {place.rating}/5{place.ratingCount ? ` · ${place.ratingCount} reviews` : ""}</p> : null}
              </div>
              <a aria-label={`Directions to ${place.name}`} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`} target="_blank" rel="noreferrer">Directions</a>
            </li>
          ))}</ul> : loaded ? <p>No matching stops within the next 60 miles and five miles of your route. Suggestions refresh as you travel.</p> : null}
        </>}
      </> : null}
    </section>
  );
}
