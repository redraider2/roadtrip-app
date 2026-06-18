import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import Background from "./components/Background";
import "./App.css";
import TripMap from "./components/TripMap";

const API_BASE_URL = "http://localhost:5001";

function estimateTripStats(start, end) {
  const knownRoutes = {
    "houston, tx|oklahoma city, ok": {
      distance: "445 miles",
      driveTime: "6 hr 45 min",
    },
    "houston|oklahoma city, oklahoma": {
      distance: "445 miles",
      driveTime: "6 hr 45 min",
    },
    "houston, tx|lubbock, tx": {
      distance: "520 miles",
      driveTime: "8 hr",
    },
  };

  const key = `${start?.toLowerCase().trim()}|${end?.toLowerCase().trim()}`;

  return (
    knownRoutes[key] || {
      distance: "Estimate not available yet",
      driveTime: "Estimate not available yet",
    }
  );
}

async function geocodePlace(place) {
  const query = place.trim();

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`,
    {
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

function App() {
  const [trips, setTrips] = useState([]);

  const [activeTripId, setActiveTripId] = useState(null);

  const [tripName, setTripName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const [stops, setStops] = useState([]);
  const [stopName, setStopName] = useState("");
  const [stopNotes, setStopNotes] = useState("");

  async function fetchTrips() {
    try {
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
    }
  }

  async function fetchStops(tripId) {
    if (!tripId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/trips/${tripId}/stops`);
      if (!res.ok) throw new Error("Failed to fetch stops");

      const data = await res.json();
      setStops(data);
    } catch (err) {
      console.error("Fetch stops failed:", err);
    }
  }

  useEffect(() => {
    fetchTrips();
  }, []);



  const activeTrip = useMemo(
    () => trips.find((t) => t.id === activeTripId) || null,
    [trips, activeTripId]
  );

  useEffect(() => {
    if (activeTrip?.id) {
      fetchStops(activeTrip.id);
    } else {
      setStops([]);
    }
  }, [activeTrip?.id]);

  const tripStats = activeTrip
    ? estimateTripStats(activeTrip.start, activeTrip.end)
    : null;

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

      await fetchTrips();

      setTripName("");
      setStart("");
      setEnd("");
      setNotes("");
    } catch (err) {
      console.error("Create trip failed:", err);
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
      console.log("GEOCODE:", name, coords);

      const res = await fetch(`${API_BASE_URL}/trips/${activeTrip.id}/stops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          latitude: coords.latitude,
          longitude: coords.longitude,
          notes: n,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add stop");
      }

      await fetchStops(activeTrip.id);

      setStopName("");
      setStopNotes("");
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
      <Background />

      <div className="app">
        <div className="hero">
          <h1 className="app-title">Roadtrip</h1>
          <p className="app-subtitle">Your personal road trip planner.</p>

          <h2 className="hero-title">Plan Your Next Adventure</h2>
          <p className="hero-text">Build and track your road trips</p>
        </div>

        <Header />

        <div className="panel">
          <h2 className="panel-title">Create a trip</h2>

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
          <TripMap start={mapStart} end={mapEnd} stops={stops} />
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
                <strong>Estimated Distance:</strong> {tripStats?.distance}
              </p>

              <p>
                <strong>Estimated Drive Time:</strong> {tripStats?.driveTime}
              </p>

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

          {!activeTrip ? (
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

                <textarea
                  value={stopNotes}
                  onChange={(e) => setStopNotes(e.target.value)}
                  placeholder="Stop notes (optional)"
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

                        <span className="trip-route">
                          Lat: {stop.latitude} | Lng: {stop.longitude}
                        </span>

                        {stop.notes && (
                          <span className="trip-notes-text">{stop.notes}</span>
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

          {trips.length === 0 ? (
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