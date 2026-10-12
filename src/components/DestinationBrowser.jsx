import { useEffect, useState } from "react";
import roster from "../data/destinationRoster.json";
import picks from "../data/destinationPicks.json" with { type: "json" };
import { getDestinationPicks } from "../lib/destinationPicks.js";
import DestinationPartnerDiscovery from "./DestinationPartnerDiscovery.jsx";
import DestinationArtworkPlacement from "./DestinationArtworkPlacement.jsx";
import { culinaryGangsterTempe } from "../lib/destinationArtworkCampaigns.js";
import "./DestinationBrowser.css";
import NashvilleRecommendations from "./NashvilleRecommendations.jsx";

const destinationIdFromHash = () => new URLSearchParams(window.location.hash.split("?")[1]).get("market");

export default function DestinationBrowser({ onHome }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(destinationIdFromHash);
  useEffect(() => {
    const update = () => setSelectedId(destinationIdFromHash());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  const selected = roster.find((destination) => destination.destinationId === selectedId);
  const inventory = picks.destinations.find((destination) => destination.destinationId === selectedId);
  const venueId = inventory?.destinationVenueIds[0];
  const entries = getDestinationPicks(venueId)?.entries || [];
  const filtered = roster.filter((destination) => `${destination.market} ${destination.state} ${destination.teamName} ${destination.conference}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="destination-browser">
      <button className="ghost-button" onClick={onHome}>← Home</button>
      <span className="section-kicker">KICKOFF MILES</span>
      <h1>Explore Destinations</h1>
      <p>Find your college football destination and start exploring the weekend.</p>
      <label htmlFor="destination-search">Search by city, state, team or conference</label>
      <input id="destination-search" className="trip-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p aria-live="polite">{filtered.length} of {roster.length} destinations</p>
      <div className="destination-browser-layout">
        <nav className="destination-browser-roster" aria-label="Destinations">
          {filtered.map((destination) => <a key={destination.destinationId} href={`#/destinations?market=${destination.destinationId}`} aria-current={selectedId === destination.destinationId ? "page" : undefined}>
            <strong>{destination.market}, {destination.state}</strong>
            <span>{destination.teamName}</span>
          </a>)}
          {filtered.length === 0 ? <p>No destinations match this search.</p> : null}
        </nav>
        <section className="destination-browser-detail" aria-label="Destination details">
          {selected ? <>
            <h2>{selected.market}, {selected.state}</h2>
            <p>{selected.teamName} · {selected.conference}</p>
            <a href={`#/destinations?market=${selected.destinationId}`}>Link to this destination</a>
            <DestinationPartnerDiscovery venueId={venueId} placement="trip_hq" />
            <DestinationArtworkPlacement campaign={culinaryGangsterTempe} venueId={venueId} placement="trip_hq" />
            <NashvilleRecommendations venueId={venueId} placement="destination" featured />
            {entries.length ? <div className="destination-browser-picks">
              {entries.map((entry) => <article key={entry.id} data-recommendation-id={entry.id}>
                <span className="section-kicker">{entry.displayLabel} · {entry.category}</span>
                <h3>{entry.title}</h3>
                <p>{entry.summary}</p>
                <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.seasonality ? "Check seasonal dates" : entry.actions[0]?.label || "Visit website"}</a>
              </article>)}
            </div> : <p>Local recommendations are being prepared for this destination. Check back as coverage grows.</p>}
          </> : <p>{selectedId ? "Destination not found. Choose a destination from the list." : "Choose a destination to see local recommendations."}</p>}
        </section>
      </div>
    </main>
  );
}
