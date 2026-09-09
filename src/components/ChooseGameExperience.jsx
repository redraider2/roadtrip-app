import { formatGameDate } from "../lib/formatters.js";

function TeamMark({ team }) {
  const logo = team?.logos?.[0];

  return (
    <span className="game-team-mark">
      {logo ? (
        <img src={logo} alt="" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{team?.school?.slice(0, 2) || "CF"}</span>
      )}
    </span>
  );
}

export default function ChooseGameExperience({
  authenticated,
  dailyDriveHours,
  error,
  games,
  loading,
  onBack,
  onDailyDriveHoursChange,
  onSelectGame,
  onStartChange,
  season,
  selectedGame,
  selectedGameId,
  selectedTeam,
  start,
  teams,
}) {
  const selectedTeamDetails = teams.find((team) => team.school === selectedTeam);

  return (
    <section className="choose-game-experience" aria-labelledby="choose-game-title">
      <header className="choose-game-header">
        <button type="button" className="choose-game-back" onClick={onBack}>
          <span aria-hidden="true">←</span> Choose another team
        </button>
        <span className="choose-game-brand">Kickoff Miles</span>
      </header>

      <div className="choose-game-team-context">
        <TeamMark team={selectedTeamDetails} />
        <div>
          <span>Your team</span>
          <strong>{selectedTeam}</strong>
          <small>{season} road schedule</small>
        </div>
      </div>

      <div className="choose-game-heading">
        <span className="choose-game-kicker">Where are we going?</span>
        <h1 id="choose-game-title">Choose Your Game</h1>
        <p>Pick the away game worth hitting the road for.</p>
      </div>

      {loading ? (
        <p className="choose-game-status">Loading road-trip destinations…</p>
      ) : error ? (
        <p className="error-state">{error}</p>
      ) : games.length === 0 ? (
        <p className="choose-game-status">
          No road games were returned for {selectedTeam} in {season}.
        </p>
      ) : (
        <div className="choose-game-grid">
          {games.map((game) => {
            const opponent = teams.find((team) => team.school === game.homeTeam);
            const selected = String(game.id) === String(selectedGameId);

            return (
              <button
                key={game.id}
                type="button"
                className={`game-destination${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onSelectGame(String(game.id))}
              >
                <span className="game-destination-date">
                  {formatGameDate(game.startDate, game.startTimeTBD)}
                </span>

                <span className="game-destination-matchup">
                  <span className="game-destination-team">
                    <TeamMark team={selectedTeamDetails} />
                    <span>{game.awayTeam}</span>
                  </span>
                  <span className="game-destination-at">at</span>
                  <span className="game-destination-team is-opponent">
                    <TeamMark team={opponent} />
                    <strong>{game.homeTeam}</strong>
                  </span>
                </span>

                <span className="game-destination-venue">
                  <span aria-hidden="true">⌖</span>
                  <span>
                    <strong>{game.venue || "Venue to be announced"}</strong>
                    <small>
                      {game.neutralSite
                        ? "Neutral-site destination"
                        : "Away-game destination"}
                    </small>
                  </span>
                </span>

                <span className="game-destination-action">
                  {selected ? "Selected" : "Choose this game"} <span aria-hidden="true">→</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedGame ? (
        <div className="game-trip-setup">
          <div className="game-trip-setup-heading">
            <span className="choose-game-kicker">Start the journey</span>
            <h2>{selectedGame.awayTeam} at {selectedGame.homeTeam}</h2>
            <p>{selectedGame.venue || "Venue to be announced"}</p>
          </div>

          <div className="game-trip-fields">
            <label>
              <span>Starting location</span>
              <input
                value={start}
                onChange={(event) => onStartChange(event.target.value)}
                placeholder="e.g., Houston, TX"
                className="trip-input"
              />
            </label>

            <label>
              <span>Daily driving preference</span>
              <select
                value={dailyDriveHours}
                onChange={(event) => onDailyDriveHoursChange(event.target.value)}
                className="trip-input"
              >
                <option value="6">Drive up to 6 hours/day</option>
                <option value="8">Drive up to 8 hours/day</option>
                <option value="10">Drive up to 10 hours/day</option>
                <option value="12">Drive up to 12 hours/day</option>
                <option value="straight">Drive straight through</option>
              </select>
            </label>
          </div>

          {!authenticated ? (
            <p className="game-trip-guest-note">
              No account needed to plan. Sign in when you want to save your trip.
            </p>
          ) : null}

          <button
            type="submit"
            className="game-trip-submit"
            disabled={loading || !start.trim()}
          >
            {loading ? "Loading…" : "Plan My Road Trip"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
