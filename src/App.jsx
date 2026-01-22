import { useEffect, useState } from "react";
import Header from "./components/Header";
import Background from "./components/Background";
import "./App.css";
import TripMap from "./components/TripMap";


function loadTrips() {
  if (typeof window === "undefined") {
    return [
      {
        id: 1,
        name: "Olympic Peninsula Weekend",
        start: "Seattle, WA",
        end: "Port Angeles, WA",
        notes: "Coastline loop + Hoh Rain Forest.",
        isFavorite: true,
        createdAt: new Date().toISOString(),
        highlights: [],
      },
      {
        id: 2,
        name: "Seattle → Houston",
        start: "Seattle, WA",
        end: "Houston, TX",
        notes: "",
        isFavorite: false,
        createdAt: new Date().toISOString(),
        highlights: [],
      },
    ];
  }

  try {
    const saved = localStorage.getItem("roadtrip.trips");
    if (!saved) {
      return [
        {
          id: 1,
          name: "Olympic Peninsula Weekend",
          start: "Seattle, WA",
          end: "Port Angeles, WA",
          notes: "Coastline loop + Hoh Rain Forest.",
          isFavorite: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Seattle → Houston",
          start: "Seattle, WA",
          end: "Houston, TX",
          notes: "",
          isFavorite: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [
      {
        id: 1,
        name: "Olympic Peninsula Weekend",
        start: "Seattle, WA",
        end: "Port Angeles, WA",
        notes: "Coastline loop + Hoh Rain Forest.",
        isFavorite: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Seattle → Houston",
        start: "Seattle, WA",
        end: "Houston, TX",
        notes: "",
        isFavorite: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

function App() {
  const [trips, setTrips] = useState(() => loadTrips());


  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("roadtrip.trips", JSON.stringify(trips));
  }, [trips]);

  const [tripName, setTripName] = useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");


  function handleSubmit(e) {
  e.preventDefault();

  const name = tripName.trim();
  const s = start.trim();
  const en = end.trim();
  const n = notes.trim();

  // Require at least start + end
  if (!s || !en) return;

  const newTrip = {
    id: Date.now(),
    name: name || `${s} → ${en}`,
    start: s,
    end: en,
    notes: n,
    isFavorite: false,
    createdAt: new Date().toISOString(),
    highlights: [],
  };

  setTrips((prev) => [newTrip, ...prev]);
  setTripName("");
  setStart("");
  setEnd("");
  setNotes("");
}

  function toggleFavorite(id) {
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === id ? { ...trip, isFavorite: !trip.isFavorite } : trip
      )
    );
  }

  function deleteTrip(id) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }

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
        <TripMap start={start} end={end} />
      </div>

      <div className="panel">
        <h2 className="panel-title">Trips</h2>

        {trips.length === 0 ? (
          <p className="empty-state">No trips yet. Add your first one above.</p>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => (
              <li key={trip.id} className="trip-row">
                <div className="trip-details">
                  <span className="trip-name">{trip.name}</span>
                  {trip.notes ? <span className="trip-notes-text">{trip.notes}</span> : null}
                </div>

                <div className="trip-actions">
                  <button
                    onClick={() => toggleFavorite(trip.id)}
                    className={`ghost-button favorite-button${trip.isFavorite ? " is-favorite" : ""}`}
                    type="button"
                    aria-pressed={trip.isFavorite}
                  >
                    {trip.isFavorite ? "★ Favorite" : "☆ Favorite"}
                  </button>

                  <button
                    onClick={() => deleteTrip(trip.id)}
                    className="ghost-button"
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);

}

export default App;
