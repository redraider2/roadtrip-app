import { formatGameDate } from "../lib/formatters.js";

export default function TripHqExperience({
  children,
  game,
  hasDrive,
  hasGameWeekend,
  hasRoute,
  onBack,
  onNavigate,
  travelPlan,
  trip,
  tripStats,
}) {
  const tripName = trip.name || trip.title || "College Football Road Trip";

  return (
    <section className="trip-hq-experience" aria-labelledby="trip-hq-title">
      <header className="trip-hq-header">
        <button type="button" className="trip-hq-back" onClick={onBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <span className="trip-hq-brand">Kickoff Miles</span>
      </header>

      <div className="trip-hq-hero">
        <span className="trip-hq-kicker">Your road trip headquarters</span>
        <h1 id="trip-hq-title">{tripName}</h1>

        {game ? (
          <p className="trip-hq-game-date">
            {formatGameDate(game.startDate, game.startTimeTBD)}
          </p>
        ) : null}

        <div className="trip-hq-journey">
          <div>
            <span>Starting point</span>
            <strong>{trip.start}</strong>
          </div>
          <span className="trip-hq-road" aria-hidden="true">
            <i />
            <b>→</b>
          </span>
          <div>
            <span>Game destination</span>
            <strong>{trip.end}</strong>
          </div>
        </div>

        <div className="trip-hq-stats" aria-label="Trip overview">
          <div>
            <span>Distance</span>
            <strong>{tripStats?.distance || "Calculating…"}</strong>
          </div>
          <div>
            <span>Drive time</span>
            <strong>{tripStats?.driveTime || "Calculating…"}</strong>
          </div>
          <div>
            <span>Travel plan</span>
            <strong>{travelPlan}</strong>
          </div>
        </div>
      </div>

      <nav className="trip-hq-gateways" aria-label="Plan this trip">
        <button
          type="button"
          disabled={!hasRoute}
          onClick={() => onNavigate("plan-route-schedule")}
        >
          <span>01</span>
          <strong>Route & Schedule</strong>
          <small>See the road ahead</small>
        </button>
        <button
          type="button"
          disabled={!hasRoute}
          onClick={() => onNavigate("plan-along-the-way")}
        >
          <span>02</span>
          <strong>Along the Way</strong>
          <small>Find worthy stops</small>
        </button>
        <button
          type="button"
          disabled={!hasRoute}
          onClick={() => onNavigate("plan-stay-itinerary")}
        >
          <span>03</span>
          <strong>Stay & Itinerary</strong>
          <small>Shape each travel day</small>
        </button>
        <button
          type="button"
          disabled={!hasDrive}
          onClick={() => onNavigate("drive")}
        >
          <span>04</span>
          <strong>Drive</strong>
          <small>Take the road trip</small>
        </button>
        <button
          type="button"
          disabled={!hasGameWeekend}
          onClick={() => onNavigate("game-weekend")}
        >
          <span>05</span>
          <strong>Game Weekend</strong>
          <small>Explore the destination</small>
        </button>
        <button
          type="button"
          disabled={!hasGameWeekend}
          onClick={() => onNavigate("game-day")}
        >
          <span>06</span>
          <strong>Game Day</strong>
          <small>Get ready for kickoff</small>
        </button>
      </nav>

      <div className="trip-hq-workspace">{children}</div>
    </section>
  );
}
