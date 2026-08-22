import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Background from "./components/Background";
import "./App.css";
import TripMap from "./components/TripMap";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

const FOOTBALL_SEASON = 2026;

async function geocodePlace(place, signal) {
  const query = place.trim();

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`,
    {
      signal,
      headers: {
        "Accept-Language": "en",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to geocode location");
  }

  const data = await res.json();

  if (!data.length) {
    throw new Error(`No location found for ${place}`);
  }

  const latitude = Number(data[0].lat);
  const longitude = Number(data[0].lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid coordinates returned");
  }

  return { latitude, longitude };
}

function isValidCoordinate(stop) {
  const latitude = Number(stop.latitude);
  const longitude = Number(stop.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0
  );
}

function formatRouteDistance(meters) {
  const miles = meters / 1609.344;
  return `${Math.round(miles).toLocaleString()} miles`;
}

function formatRouteDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} hr ${minutes} min`;
}

function formatGameDate(startDate, startTimeTBD) {
  if (!startDate) return "Date TBD";

  const date = new Date(startDate);

  const dateText = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (startTimeTBD) {
    return `${dateText} · Kickoff TBD`;
  }

  const timeText = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateText} · ${timeText}`;
}

async function fetchRoadRoute(points, signal) {
  const res = await fetch(`${API_BASE_URL}/route`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    throw new Error("Failed to calculate road route");
  }

  return res.json();
}

function formatTripStats(route) {
  if (!route) return null;

  return {
    distance: formatRouteDistance(route.distanceMeters),
    driveTime: formatRouteDuration(route.durationSeconds),
    provider: route.provider,
  };
}

function App() {
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [tripsError, setTripsError] = useState("");

  const [tripName, setTripName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const [footballTeams, setFootballTeams] = useState([]);
  const [selectedFootballTeam, setSelectedFootballTeam] = useState("");
  const [footballGames, setFootballGames] = useState([]);
  const [selectedFootballGameId, setSelectedFootballGameId] = useState("");
  const [footballStart, setFootballStart] = useState("");
  const [footballLoading, setFootballLoading] = useState(false);
  const [footballError, setFootballError] = useState("");
  const [weekendPlaces, setWeekendPlaces] = useState({
    restaurant: [],
    bar: [],
  });
  const [weekendPlacesLoading, setWeekendPlacesLoading] = useState(false);
  const [weekendPlacesError, setWeekendPlacesError] = useState("");

  const [stops, setStops] = useState([]);
  const [stopsError, setStopsError] = useState("");
  const [stopName, setStopName] = useState("");
  const [stopType, setStopType] = useState("waypoint");
  const [stopRating, setStopRating] = useState("");
  const [stopNotes, setStopNotes] = useState("");
  const [stopTrivia, setStopTrivia] = useState("");

  const [tripStats, setTripStats] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);

  async function fetchTrips() {
    try {
      setTripsError("");
      const res = await fetch(`${API_BASE_URL}/trips`);
      if (!res.ok) throw new Error("Failed to fetch trips");

      const data = await res.json();

      const normalizedTrips = data.map((trip) => ({
        id: Number(trip.id),
        name: trip.title,
        start: trip.start_location || "",
        end: trip.end_location || "",
        notes: trip.notes || "",
        isFavorite: Boolean(trip.is_favorite),
        createdAt: trip.createdAt,
        highlights: [],
      }));

      setTrips(normalizedTrips);

      setActiveTripId((currentId) => {
        if (currentId && normalizedTrips.some((t) => t.id === currentId)) {
          return currentId;
        }
        return normalizedTrips[0]?.id ?? null;
      });
    } catch (err) {
      console.error("Failed to load trips:", err);
      setTripsError(
        "Trips could not be loaded. Check that the API and PostgreSQL database are running."
      );
    }
  }

  async function fetchStops(tripId) {
    if (!tripId) return;

    try {
      setStopsError("");
      const res = await fetch(`${API_BASE_URL}/trips/${tripId}/stops`);
      if (!res.ok) throw new Error("Failed to fetch stops");

      const data = await res.json();
      setStops(data);
    } catch (err) {
      console.error("Fetch stops failed:", err);
      setStopsError(
        "Stops could not be loaded for this trip. Check the API/database connection."
      );
    }
  }

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFootballTeams() {
      try {
        setFootballError("");
        const res = await fetch(`${API_BASE_URL}/football/teams`);

        if (!res.ok) {
          throw new Error("Failed to fetch FBS teams");
        }

        const data = await res.json();

        if (!cancelled) {
          setFootballTeams(data);
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Football teams failed:", err);
        setFootballError(
          "College football teams could not be loaded. Check the backend API."
        );
      }
    }

    loadFootballTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadFootballGames() {
      if (!selectedFootballTeam) {
        setFootballGames([]);
        setSelectedFootballGameId("");
        return;
      }

      try {
        setFootballLoading(true);
        setFootballError("");
        setFootballGames([]);
        setSelectedFootballGameId("");

        const res = await fetch(
          `${API_BASE_URL}/football/games?team=${encodeURIComponent(
            selectedFootballTeam
          )}&year=${FOOTBALL_SEASON}&awayOnly=true`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch road games");
        }

        const data = await res.json();

        if (!cancelled) {
          setFootballGames(data);
        }
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Football games failed:", err);
        setFootballError(
          "Away games could not be loaded for that team. Try another team or check the backend API."
        );
      } finally {
        if (!cancelled) {
          setFootballLoading(false);
        }
      }
    }

    loadFootballGames();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedFootballTeam]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  );

  const selectedFootballGame = useMemo(
    () =>
      footballGames.find(
        (game) => String(game.id) === String(selectedFootballGameId)
      ) || null,
    [footballGames, selectedFootballGameId]
  );

  const backgroundTeam = useMemo(() => {
    const destinationTeam = selectedFootballGame?.homeTeam;

    if (destinationTeam) {
      return (
        footballTeams.find((team) => team.school === destinationTeam) || null
      );
    }

    if (selectedFootballTeam) {
      return (
        footballTeams.find((team) => team.school === selectedFootballTeam) ||
        null
      );
    }

    return null;
  }, [footballTeams, selectedFootballGame, selectedFootballTeam]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadWeekendPlaces() {
      if (!selectedFootballGame?.venueId) {
        setWeekendPlaces({ restaurant: [], bar: [] });
        setWeekendPlacesError("");
        return;
      }

      try {
        setWeekendPlacesLoading(true);
        setWeekendPlacesError("");

        const venueId = selectedFootballGame.venueId;

        const [restaurantRes, barRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/football/venues/${venueId}/places?category=restaurant`,
            { signal: controller.signal }
          ),
          fetch(
            `${API_BASE_URL}/football/venues/${venueId}/places?category=bar`,
            { signal: controller.signal }
          ),
        ]);

        if (!restaurantRes.ok || !barRes.ok) {
          throw new Error("Failed to load game weekend places");
        }

        const [restaurantData, barData] = await Promise.all([
          restaurantRes.json(),
          barRes.json(),
        ]);

        if (cancelled) return;

        setWeekendPlaces({
          restaurant: restaurantData.places || [],
          bar: barData.places || [],
        });
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Game weekend places failed:", err);
        setWeekendPlaces({
          restaurant: [],
          bar: [],
        });
        setWeekendPlacesError(
          "Restaurants and bars could not be loaded for this game."
        );
      } finally {
        if (!cancelled) {
          setWeekendPlacesLoading(false);
        }
      }
    }

    loadWeekendPlaces();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedFootballGame?.venueId]);

  useEffect(() => {
    if (activeTrip?.id) {
      fetchStops(activeTrip.id);
    } else {
      setStops([]);
    }
  }, [activeTrip?.id]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadTripStats() {
      if (!activeTrip?.start || !activeTrip?.end) {
        setTripStats(null);
        setRouteGeometry([]);
        return;
      }

      setTripStats({
        distance: "Calculating...",
        driveTime: "Calculating...",
      });
      setRouteGeometry([]);

      try {
        const [startCoords, endCoords] = await Promise.all([
          geocodePlace(activeTrip.start, controller.signal),
          geocodePlace(activeTrip.end, controller.signal),
        ]);

        const orderedStops = stops
          .filter(isValidCoordinate)
          .sort((a, b) => a.order_index - b.order_index)
          .map((stop) => ({
            latitude: Number(stop.latitude),
            longitude: Number(stop.longitude),
          }));

        const route = await fetchRoadRoute(
          [startCoords, ...orderedStops, endCoords],
          controller.signal
        );

        if (cancelled) return;

        setTripStats(formatTripStats(route));
        setRouteGeometry(route.geometry || []);
      } catch (err) {
        if (cancelled || err?.name === "AbortError") return;

        console.error("Trip stats failed:", err);
        setTripStats({
          distance: "Road route unavailable",
          driveTime: "Road route unavailable",
        });
        setRouteGeometry([]);
      }
    }

    loadTripStats();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeTrip?.start, activeTrip?.end, stops]);

  async function handleSubmit(e) {
    e.preventDefault();

    const name = tripName.trim();
    const s = start.trim();
    const en = end.trim();
    const n = notes.trim();

    if (!s || !en) return;

    try {
      const res = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: name || `${s} → ${en}`,
          start_location: s,
          end_location: en,
          notes: n,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create trip");
      }

      const createdTrip = await res.json();

      await fetchTrips();
      setActiveTripId(Number(createdTrip.id));

      setTripName("");
      setStart("");
      setEnd("");
      setNotes("");
    } catch (err) {
      console.error("Create trip failed:", err);
    }
  }

  async function handleFootballTripSubmit(e) {
    e.preventDefault();

    const s = footballStart.trim();

    if (!selectedFootballTeam || !selectedFootballGame || !s) {
      setFootballError(
        "Choose a team, choose an away game, and enter your starting location."
      );
      return;
    }

    try {
      setFootballLoading(true);
      setFootballError("");

      const venueRes = await fetch(
        `${API_BASE_URL}/football/venues/${selectedFootballGame.venueId}`
      );

      if (!venueRes.ok) {
        throw new Error("Failed to load stadium details");
      }

      const venue = await venueRes.json();

      const destinationParts = [
        venue.name,
        venue.city,
        venue.state,
      ].filter(Boolean);

      const destination = destinationParts.join(", ");

      if (!destination) {
        throw new Error("Stadium destination is unavailable");
      }

      const matchup = `${selectedFootballGame.awayTeam} @ ${selectedFootballGame.homeTeam}`;
      const gameDate = formatGameDate(
        selectedFootballGame.startDate,
        selectedFootballGame.startTimeTBD
      );

      const tripRes = await fetch(`${API_BASE_URL}/trips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: matchup,
          start_location: s,
          end_location: destination,
          notes: `${gameDate} · ${venue.name}`,
        }),
      });

      if (!tripRes.ok) {
        throw new Error("Failed to create football road trip");
      }

      const createdTrip = await tripRes.json();

      await fetchTrips();
      setActiveTripId(Number(createdTrip.id));

      setStart("");
      setEnd("");
      setTripName("");
      setNotes("");
    } catch (err) {
      console.error("Football trip creation failed:", err);
      setFootballError(
        "The football road trip could not be created. Check the backend and try again."
      );
    } finally {
      setFootballLoading(false);
    }
  }

  async function handleAddStop(e) {
    e.preventDefault();

    if (!activeTrip) return;

    const name = stopName.trim();
    const n = stopNotes.trim();

    if (!name) return;

    try {
      const coords = await geocodePlace(name);

      const res = await fetch(`${API_BASE_URL}/trips/${activeTrip.id}/stops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          location_type: stopType,
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: n,
          trivia: stopTrivia.trim(),
          rating: stopRating,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add stop");
      }

      await fetchStops(activeTrip.id);

      setStopName("");
      setStopType("waypoint");
      setStopRating("");
      setStopNotes("");
      setStopTrivia("");
    } catch (err) {
      console.error("Add stop failed:", err);
      alert("Could not find that location. Try a city and state, like Waco, TX.");
    }
  }

  async function moveStop(id, direction) {
    if (!activeTrip) return;

    try {
      const res = await fetch(`${API_BASE_URL}/stops/${id}/order`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });

      if (!res.ok) {
        throw new Error("Failed to reorder stop");
      }

      await fetchStops(activeTrip.id);
    } catch (err) {
      console.error("Move stop failed:", err);
    }
  }

  async function deleteStop(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/stops/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete stop");
      }

      setStops((prev) => prev.filter((stop) => stop.id !== id));
    } catch (err) {
      console.error("Delete stop failed:", err);
    }
  }

  async function toggleFavorite(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/trips/${id}/favorite`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error("Failed to update favorite");
      }

      const updatedTrip = await res.json();

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === id
            ? { ...trip, isFavorite: Boolean(updatedTrip.is_favorite) }
            : trip
        )
      );
    } catch (err) {
      console.error("Favorite update failed:", err);
    }
  }

  async function deleteTrip(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete trip");
      }

      setTrips((prev) => {
        const next = prev.filter((t) => t.id !== id);

        if (id === activeTripId) {
          setActiveTripId(next[0]?.id ?? null);
        }

        return next;
      });
    } catch (err) {
      console.error("Delete trip failed:", err);
    }
  }

  const mapStart = start.trim() || activeTrip?.start || "";
  const mapEnd = end.trim() || activeTrip?.end || "";

  return (
    <div className="page">
      <Background team={backgroundTeam} />

      <div className="app">
        <div className="hero">
          <h1 className="app-title">College Football RoadTrip</h1>
          <p className="app-subtitle">
            Plan the drive. Pick the game. Make the weekend count.
          </p>

          <h2 className="hero-title">Plan Your Next Away Game</h2>
          <p className="hero-text">
            Choose your team and turn the next road game into a road trip.
          </p>
        </div>

        <Header />

        <div className="panel">
          <h2 className="panel-title">Plan a College Football Road Trip</h2>

          <form onSubmit={handleFootballTripSubmit} className="trip-form">
            <select
              value={selectedFootballTeam}
              onChange={(e) => setSelectedFootballTeam(e.target.value)}
              className="trip-input"
              aria-label="College football team"
            >
              <option value="">Choose your team</option>
              {footballTeams.map((team) => (
                <option key={team.id} value={team.school}>
                  {team.school}
                  {team.mascot ? ` ${team.mascot}` : ""}
                </option>
              ))}
            </select>

            <select
              value={selectedFootballGameId}
              onChange={(e) => setSelectedFootballGameId(e.target.value)}
              className="trip-input"
              aria-label="Away game"
              disabled={!selectedFootballTeam || footballLoading}
            >
              <option value="">
                {!selectedFootballTeam
                  ? "Choose a team first"
                  : footballLoading
                  ? "Loading away games..."
                  : "Choose an away game"}
              </option>

              {footballGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.awayTeam} @ {game.homeTeam} —{" "}
                  {formatGameDate(game.startDate, game.startTimeTBD)} —{" "}
                  {game.venue || "Venue TBD"}
                </option>
              ))}
            </select>

            <input
              value={footballStart}
              onChange={(e) => setFootballStart(e.target.value)}
              placeholder="Starting location (e.g., Houston, TX)"
              className="trip-input"
            />

            {selectedFootballGame ? (
              <div className="trip-details-panel">
                <p>
                  <strong>Matchup:</strong>{" "}
                  {selectedFootballGame.awayTeam} @{" "}
                  {selectedFootballGame.homeTeam}
                </p>
                <p>
                  <strong>Game:</strong>{" "}
                  {formatGameDate(
                    selectedFootballGame.startDate,
                    selectedFootballGame.startTimeTBD
                  )}
                </p>
                <p>
                  <strong>Stadium:</strong>{" "}
                  {selectedFootballGame.venue || "Venue TBD"}
                </p>
              </div>
            ) : null}

            {footballError ? (
              <p className="error-state">{footballError}</p>
            ) : null}

            {selectedFootballTeam &&
            !footballLoading &&
            footballGames.length === 0 &&
            !footballError ? (
              <p className="empty-state">
                No road games were returned for {selectedFootballTeam} in{" "}
                {FOOTBALL_SEASON}.
              </p>
            ) : null}

            <button
              type="submit"
              className="primary-button"
              disabled={
                footballLoading ||
                !selectedFootballTeam ||
                !selectedFootballGame ||
                !footballStart.trim()
              }
            >
              {footballLoading ? "Loading..." : "Create Game Road Trip"}
            </button>
          </form>
        </div>

        {selectedFootballGame ? (
          <div className="panel">
            <h2 className="panel-title">Game Weekend</h2>

            <div className="trip-details-panel">
              <p>
                <strong>Destination:</strong>{" "}
                {selectedFootballGame.venue || "Venue TBD"}
              </p>
              <p>
                <strong>Host:</strong> {selectedFootballGame.homeTeam}
              </p>
            </div>

            {weekendPlacesLoading ? (
              <p className="empty-state">
                Finding popular restaurants and bars near the stadium...
              </p>
            ) : weekendPlacesError ? (
              <p className="error-state">{weekendPlacesError}</p>
            ) : (
              <div className="game-weekend-grid">
                <div>
                  <h3 className="game-weekend-heading">Restaurants</h3>

                  {weekendPlaces.restaurant.length === 0 ? (
                    <p className="empty-state">
                      No nearby restaurants returned.
                    </p>
                  ) : (
                    <ul className="trip-list">
                      {weekendPlaces.restaurant.slice(0, 6).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>

                            <span className="trip-route">
                              {place.rating
                                ? `${place.rating} ★`
                                : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>

                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}

                            {place.website ? (
                              <a
                                className="place-link"
                                href={place.website}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visit website
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="game-weekend-heading">Bars</h3>

                  {weekendPlaces.bar.length === 0 ? (
                    <p className="empty-state">No nearby bars returned.</p>
                  ) : (
                    <ul className="trip-list">
                      {weekendPlaces.bar.slice(0, 6).map((place) => (
                        <li key={place.id} className="trip-row">
                          <div className="trip-details">
                            <span className="trip-name">{place.name}</span>

                            <span className="trip-route">
                              {place.rating
                                ? `${place.rating} ★`
                                : "No rating"}
                              {place.ratingCount
                                ? ` · ${place.ratingCount.toLocaleString()} reviews`
                                : ""}
                            </span>

                            {place.address ? (
                              <span className="trip-notes-text">
                                {place.address}
                              </span>
                            ) : null}

                            {place.website ? (
                              <a
                                className="place-link"
                                href={place.website}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Visit website
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="panel">
          <h2 className="panel-title">Create a Custom Trip</h2>

          <form onSubmit={handleSubmit} className="trip-form">
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Trip name (optional)"
              className="trip-input"
            />

            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Start (e.g., Seattle, WA)"
              className="trip-input"
            />

            <input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="End (e.g., Houston, TX)"
              className="trip-input"
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="trip-input trip-notes"
              rows={3}
            />

            <button type="submit" className="primary-button">
              Add Trip
            </button>
          </form>
        </div>

        <div className="panel">
          <h2 className="panel-title">Map Preview</h2>
          <TripMap
            start={mapStart}
            end={mapEnd}
            stops={stops}
            routeGeometry={routeGeometry}
          />
        </div>

        <div className="panel">
          <h2 className="panel-title">Selected Trip</h2>

          {!activeTrip ? (
            <p className="empty-state">Select a trip.</p>
          ) : (
            <div className="trip-details-panel">
              <p>
                <strong>Name:</strong> {activeTrip.name}
              </p>

              <p>
                <strong>Start:</strong> {activeTrip.start}
              </p>

              <p>
                <strong>End:</strong> {activeTrip.end}
              </p>

              <p>
                <strong>Notes:</strong> {activeTrip.notes || "None"}
              </p>

              <p>
                <strong>Road Distance:</strong> {tripStats?.distance}
              </p>

              <p>
                <strong>Road Drive Time:</strong> {tripStats?.driveTime}
              </p>

              {tripStats?.provider ? (
                <p>
                  <strong>Routing Provider:</strong> {tripStats.provider}
                </p>
              ) : null}

              <button
                className="ghost-button"
                onClick={() => deleteTrip(activeTrip.id)}
              >
                Delete Trip
              </button>
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="panel-title">Stops / Waypoints</h2>

          {stopsError ? (
            <p className="error-state">{stopsError}</p>
          ) : !activeTrip ? (
            <p className="empty-state">Select a trip to add stops.</p>
          ) : (
            <>
              <form onSubmit={handleAddStop} className="trip-form">
                <input
                  value={stopName}
                  onChange={(e) => setStopName(e.target.value)}
                  placeholder="Stop name (e.g., Dallas, TX)"
                  className="trip-input"
                />

                <select
                  value={stopType}
                  onChange={(e) => setStopType(e.target.value)}
                  className="trip-input compact-input"
                  aria-label="Stop type"
                >
                  <option value="waypoint">Waypoint</option>
                  <option value="historic">Historic</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="scenic">Scenic</option>
                  <option value="museum">Museum</option>
                </select>

                <select
                  value={stopRating}
                  onChange={(e) => setStopRating(e.target.value)}
                  className="trip-input compact-input"
                  aria-label="Rating"
                >
                  <option value="">No rating</option>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>

                <textarea
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Stop notes (optional)"
                  className="trip-input trip-notes"
                  rows={2}
                />

                <textarea
                  value={stopTrivia}
                  onChange={(e) => setStopTrivia(e.target.value)}
                  placeholder="Fun trivia or historic context (optional)"
                  className="trip-input trip-notes"
                  rows={2}
                />

                <button type="submit" className="primary-button">
                  Add Stop
                </button>
              </form>

              {stops.length === 0 ? (
                <p className="empty-state">No stops added yet.</p>
              ) : (
                <ul className="trip-list">
                  {stops.map((stop) => (
                    <li key={stop.id} className="trip-row">
                      <div className="trip-details">
                        <span className="trip-name">
                          {stop.order_index + 1}. {stop.name}
                        </span>

                        <span className="stop-meta">
                          <span className="stop-badge">
                            {stop.location_type || "waypoint"}
                          </span>

                          {stop.avg_rating ? (
                            <span className="stop-rating">
                              Rating: {stop.avg_rating}/5
                            </span>
                          ) : null}
                        </span>

                        <span className="trip-route">
                          Lat: {stop.latitude} | Lng: {stop.longitude}
                        </span>

                        {stop.notes && (
                          <span className="trip-notes-text">{stop.notes}</span>
                        )}

                        {stop.description && (
                          <span className="trip-trivia-text">
                            Trivia: {stop.description}
                          </span>
                        )}
                      </div>

                      <div className="trip-actions">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => moveStop(stop.id, "up")}
                        >
                          ↑
                        </button>

                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => moveStop(stop.id, "down")}
                        >
                          ↓
                        </button>

                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => deleteStop(stop.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <h2 className="panel-title">Trips</h2>

          {tripsError ? (
            <p className="error-state">{tripsError}</p>
          ) : trips.length === 0 ? (
            <p className="empty-state">No trips yet. Add your first one above.</p>
          ) : (
            <ul className="trip-list">
              {[...trips]
                .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
                .map((trip) => {
                  const isActive = trip.id === activeTripId;

                  return (
                    <li
                      key={trip.id}
                      className={`trip-row${isActive ? " is-active" : ""}`}
                      onClick={() => setActiveTripId(trip.id)}
                    >
                      <div className="trip-details">
                        <span className="trip-name">{trip.name}</span>

                        <span className="trip-route">
                          {trip.start} → {trip.end}
                        </span>

                        {trip.notes && (
                          <span className="trip-notes-text">{trip.notes}</span>
                        )}
                      </div>

                      <div className="trip-actions">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(trip.id);
                          }}
                        >
                          {trip.isFavorite ? "★" : "☆"}
                        </button>

                        <button
                          className="ghost-button"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTrip(trip.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
