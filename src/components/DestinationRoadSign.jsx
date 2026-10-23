export default function DestinationRoadSign({ destination = "", venue, onExplore }) {
  const parts = destination.split(",").map(part => part.trim()).filter(Boolean);
  const city = parts.length > 1 ? parts.slice(1).join(", ") : destination;
  const stadium = venue || parts[0];
  if (!city) return null;
  return (
    <aside className="along-destination-sign-section" aria-label="Along the Way destination road sign">
      <div className="along-destination-sign-copy">
        <span className="section-kicker">KEEP THE DESTINATION IN SIGHT</span>
        <h3>A few great stops. One great destination.</h3>
        <p>Make the most of the road to {city}. Your game weekend is waiting at the other end.</p>
      </div>
      <button type="button" className="along-destination-road-sign" onClick={onExplore} aria-label={`Explore game weekend in ${city}`}>
        <span className="along-sign-top">GAME WEEKEND AHEAD <span aria-hidden="true">↗</span></span>
        <strong>{city}</strong>
        <span className="along-sign-venue">{stadium}</span>
        <span className="along-sign-link">Explore the destination <span aria-hidden="true">→</span></span>
      </button>
    </aside>
  );
}
