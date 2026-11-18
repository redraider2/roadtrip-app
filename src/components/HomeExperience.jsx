import Header from "./Header.jsx";
import SampleTrip from "./SampleTrip.jsx";

export default function HomeExperience({
  accountLabel,
  children,
  onChooseTeam,
  onBrowseDestinations,
  onViewSampleTrip,
}) {
  return (
    <section className="home-experience" aria-labelledby="home-headline">
      <Header />

      <div className="home-hero-stage">
        <div className="home-hero-copy">
          <span className="home-eyebrow">College football road trips start here</span>
          <h1 id="home-headline">
            <span className="home-headline-line home-headline-line-one">
              <span>Let&rsquo;s</span>
              <span>Hit</span>
            </span>
            <span className="home-headline-line">The Road!</span>
          </h1>
          <p>Pick your team. Choose a game. Build the road trip.</p>

          <div className="home-actions">
            <button
              type="button"
              className="home-primary-cta"
              onClick={onChooseTeam}
            >
              <span>Choose Your Team</span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="ghost-button" onClick={onBrowseDestinations}>Explore Destinations</button>
          </div>
          <p className="home-guest-note">
            No account needed to plan. Sign in when you want to save your trip.
          </p>
          <button type="button" className="home-sample-link" onClick={onViewSampleTrip}>
            See a sample trip <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>

      <SampleTrip onChooseTeam={onChooseTeam} onBrowseDestinations={onBrowseDestinations} />

      <details className="home-account-access">
        <summary>{accountLabel}</summary>
        <div className="home-account-content">{children}</div>
      </details>
    </section>
  );
}
