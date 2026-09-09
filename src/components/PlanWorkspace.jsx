const PLAN_TABS = [
  { id: "plan-route-schedule", label: "Route & Schedule" },
  { id: "plan-along-the-way", label: "Along the Way" },
  { id: "plan-stay-itinerary", label: "Stay & Itinerary" },
];

function shortLocation(value = "") {
  return String(value).split(",")[0].trim() || "Location TBD";
}

function destinationCity(value = "") {
  const parts = String(value).split(",").map((part) => part.trim());
  return parts.length > 1 ? parts[1] : parts[0] || "Destination TBD";
}

function shortGameDate(game) {
  if (!game?.startDate) return null;

  return new Date(game.startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PlanWorkspace({
  activeSection,
  children,
  game,
  onNavigate,
  trip,
}) {
  const matchup = game
    ? `${game.awayTeam} @ ${game.homeTeam}`
    : trip.name || trip.title || "College Football Road Trip";
  const gameDate = shortGameDate(game);
  const venue = game?.venue || shortLocation(trip.end);

  return (
    <section className="plan-workspace" aria-labelledby="plan-workspace-title">
      <header className="plan-workspace-header">
        <button type="button" className="plan-workspace-back" onClick={() => onNavigate("trip-hq")}>
          <span aria-hidden="true">←</span> Trip HQ
        </button>
        <span className="plan-workspace-brand">Kickoff Miles</span>
      </header>

      <div className="plan-workspace-title-row">
        <div>
          <span className="plan-workspace-kicker">Build the road ahead</span>
          <h1 id="plan-workspace-title">Plan Your Road Trip</h1>
        </div>
        <div className="plan-trip-identity">
          <strong>{matchup}</strong>
          <span>
            {shortLocation(trip.start)} → {destinationCity(trip.end)}
            {gameDate ? ` · ${gameDate}` : ""} · {venue}
          </span>
        </div>
      </div>

      <nav className="plan-tabs" aria-label="Plan your road trip">
        {PLAN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeSection === tab.id ? "is-active" : ""}
            aria-current={activeSection === tab.id ? "page" : undefined}
            onClick={() => onNavigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="plan-workspace-content">{children}</div>
    </section>
  );
}
