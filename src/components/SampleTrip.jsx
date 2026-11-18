export default function SampleTrip({ onChooseTeam, onBrowseDestinations, standalone = false }) {
  return (
    <section className="home-sample-trip" id="sample-trip" tabIndex={-1} aria-labelledby="sample-trip-title">
      <header className="sample-trip-heading">
        <span className="sample-trip-kicker">A weekend worth the drive · Sample trip</span>
        <h2 id="sample-trip-title">Chicago to Tuscaloosa. Auburn at Alabama.</h2>
        <p>A college football road trip is a journey built around a game, with a driving route and places to stop.</p>
      </header>

      <ol className="sample-trip-steps">
        <li className="sample-trip-card">
          <span className="sample-trip-step">01 · Pick the game</span>
          <div className="sample-trip-matchup" aria-label="Auburn at Alabama">
            <strong>Auburn</strong><span>at</span><strong>Alabama</strong>
          </div>
          <h3>Start with the rivalry.</h3>
          <p>Choose your team and an upcoming road game. This example heads to Tuscaloosa, Alabama.</p>
        </li>
        <li className="sample-trip-card">
          <span className="sample-trip-step">02 · Map the drive</span>
          <div className="sample-trip-route" aria-label="Example route from Chicago to Tuscaloosa">
            <span>Chicago, IL</span><span className="sample-trip-route-line" aria-hidden="true" /><strong>Tuscaloosa, AL</strong>
          </div>
          <h3>Make room for the journey.</h3>
          <dl className="sample-trip-stats">
            <div><dt>Distance</dt><dd>~718 miles</dd></div>
            <div><dt>Drive time</dt><dd>~10 hr 43 min</dd></div>
          </dl>
          <p>At up to 8 hours of driving per day: two travel days with one overnight stop.</p>
        </li>
        <li className="sample-trip-card">
          <span className="sample-trip-step">03 · Explore the weekend</span>
          <ul className="sample-trip-places">
            <li><span>Stay</span><strong>Hotel Capstone</strong></li>
            <li><span>Explore</span><strong>Paul W. Bryant Museum</strong></li>
            <li><span>Get local ideas</span><strong>Visit Tuscaloosa</strong></li>
          </ul>
          <h3>Find your kind of weekend.</h3>
          <p>Discover places to stay and things to do, then visit provider websites to check details and availability.</p>
        </li>
      </ol>

      <p className="sample-trip-disclaimer">Sample estimates; your route and timing may vary. Check official game details and confirm hotel availability and renovation updates before booking.</p>
      <div className="sample-trip-actions">
        {standalone ? <>
          <a className="home-primary-cta" href={`${import.meta.env.BASE_URL}#/choose-team`}>Plan your own road trip <span aria-hidden="true">→</span></a>
          <a className="sample-trip-secondary" href={`${import.meta.env.BASE_URL}#/destinations`}>Explore destinations</a>
        </> : <>
        <button type="button" className="home-primary-cta" onClick={onChooseTeam}>Plan your own road trip <span aria-hidden="true">→</span></button>
        <button type="button" className="sample-trip-secondary" onClick={onBrowseDestinations}>Explore destinations</button>
        </>}
      </div>
    </section>
  );
}
