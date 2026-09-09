import Header from "./Header.jsx";

export default function HomeExperience({
  accountLabel,
  children,
  onChooseTeam,
}) {
  return (
    <section className="home-experience" aria-labelledby="home-headline">
      <Header />

      <div className="home-hero-stage">
        <div className="home-hero-copy">
          <span className="home-eyebrow">College football road trips start here</span>
          <h1 id="home-headline">
            <span>Let&rsquo;s Hit</span>
            <span>The Road!</span>
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
          </div>
        </div>
      </div>

      <details className="home-account-access">
        <summary>{accountLabel}</summary>
        <div className="home-account-content">{children}</div>
      </details>
    </section>
  );
}
