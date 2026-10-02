import { getDestinationPicks } from "../lib/destinationPicks.js";
import "./DestinationPicks.css";

export default function DestinationPicks({ venueId }) {
  const destination = getDestinationPicks(venueId);
  if (!destination?.entries.length) return null;
  return (
    <section className="destination-picks" aria-label={`Kickoff Miles Picks for ${destination.market}`}>
      <header>
        <span className="section-kicker">EXPLORE {destination.market.toUpperCase()}</span>
        <h2>Kickoff Miles Picks</h2>
        <p>Ideas for your {destination.market} football weekend. Selected by Kickoff Miles, independently of paid partner placements.</p>
      </header>
      <div className="destination-picks-grid">
        {destination.entries.map((entry) => (
          <article className="destination-pick" key={entry.id} data-pick-id={entry.id}>
            <span className="destination-pick-label">{entry.displayLabel} · {entry.category}</span>
            <h3>{entry.title}</h3>
            <p>{entry.summary}</p>
            {entry.actions.map((action) => (
              <a key={action.url} href={action.url} target="_blank" rel="noopener noreferrer">
                {entry.seasonality ? "Check seasonal dates" : action.label}<span className="destination-pick-sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
