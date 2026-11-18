import { getBowlGuidePicks } from "../lib/bowlDestinations.js";
import "./BowlDestinationGuide.css";

export default function BowlDestinationGuide({ destination, compact = false, gameDay = false }) {
  if (!destination) return null;
  const entries = getBowlGuidePicks(destination);
  return (
    <section className="bowl-destination-guide" aria-label={`${destination.market} bowl destination guide`} data-bowl-destination={destination.destinationId}>
      <header>
        <span className="section-kicker">{destination.cfpRound ? "BOWL & CFP DESTINATION GUIDE" : "BOWL DESTINATION GUIDE"}</span>
        <h2>{destination.market}, {destination.state}</h2>
        <p className="bowl-guide-venue">{destination.venueName}</p>
        <p>{destination.intro}</p>
        <p className="bowl-guide-events">2026–27 host site: {destination.events.join(" · ")}{destination.cfpRound && !destination.events.some(event => event.includes("CFP")) ? ` · CFP ${destination.cfpRound}` : ""}</p>
      </header>
      {destination.travelNote ? <p className="bowl-guide-note">{destination.travelNote}</p> : null}
      {destination.venueStatusNote ? <p className="bowl-guide-note">{destination.venueStatusNote}</p> : null}
      <div className="bowl-guide-arrival">
        {destination.arrival.map(item => <article key={item.title}>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer">Open official venue or event guide ↗</a>
        </article>)}
      </div>
      <p>{destination.eventPlanning.text} <a href={destination.eventPlanning.url} target="_blank" rel="noopener noreferrer">Official event information ↗</a></p>
      {!gameDay && !compact ? <>
        <h3>Local recommendations</h3>
        <p className="bowl-guide-disclosure">Editorial picks and official resources. Check holiday hours, reservations, and room availability for your dates.</p>
        <div className="bowl-guide-picks">
          {entries.filter(entry => entry.category !== "Game day").map(entry => <article key={entry.id} data-recommendation-id={entry.id}>
            <span className="section-kicker">{entry.displayLabel} · {entry.category}</span>
            <h4>{entry.title}</h4><p>{entry.summary}</p>
            <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.actions[0]?.label || "Explore official website"} ↗</a>
          </article>)}
        </div>
      </> : <a className="bowl-guide-all-link" href={`#/destinations?market=${destination.destinationId}`}>See the full {destination.market} guide and local picks →</a>}
      <p className="bowl-guide-reviewed">Host-site information checked November 18, 2026. <a href={destination.scheduleSourceUrl} target="_blank" rel="noopener noreferrer">Bowl Season host listing ↗</a></p>
    </section>
  );
}
