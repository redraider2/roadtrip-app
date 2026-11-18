import PlanningMainNavigation from "./PlanningMainNavigation.jsx";

export default function Header() {
  return (
    <header className="home-brand-header">
      <img
        src={`${import.meta.env.BASE_URL}kickoff-miles-logo.png`}
        width={1254}
        height={1254}
        alt=""
        aria-hidden="true"
        className="home-brand-mark"
      />
      <div className="home-brand-copy">
        <span className="home-brand-name">Kickoff Miles</span>
        <span className="home-brand-tagline">Hit the Road. Chase the Game.</span>
        <PlanningMainNavigation />
      </div>
    </header>
  );
}
