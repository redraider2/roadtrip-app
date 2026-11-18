import { getGameTeams, formatGameMatchup, gameDestinationLabel, isCollegeFootballPlayoff, playoffRoundLabel } from "../lib/footballSchedule.js";
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
  onBrowseDestinations,
  onViewSampleTrip,
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
  const playoffGames = games.filter(isCollegeFootballPlayoff);
  const otherGames = games.filter(game => !isCollegeFootballPlayoff(game));
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
        <p>Choose an away game, neutral-site matchup, or bowl trip.</p>
        <p className="choose-game-schedule-note">Bowl and playoff matchups appear as they are announced and added to the schedule.</p>
      </div>

      {loading ? (
        <p className="choose-game-status">Loading road-trip destinations…</p>
      ) : error ? (
        <p className="error-state">{error}</p>
      ) : games.length === 0 ? (
        <>
        <section className="choose-game-playoff" aria-label="College Football Playoff">
          <header className="choose-game-section-heading">
            <span className="choose-game-kicker">The road to a championship</span>
            <h2>College Football Playoff</h2>
          </header>
          <p>No upcoming College Football Playoff matchups are announced for {selectedTeam} yet.</p>
        </section>
        <section className="choose-game-empty" aria-labelledby="no-road-games-title">
          <h2 id="no-road-games-title">No upcoming away, neutral-site, or postseason games are listed for {selectedTeam} in {season}.</h2>
          <p>There’s still a weekend worth exploring. Browse college towns for places to stay, eat, and visit, or see how a road trip comes together.</p>
          <div className="choose-game-empty-actions">
            <button type="button" className="home-primary-cta" onClick={onBrowseDestinations}>Explore college towns <span aria-hidden="true">→</span></button>
            <button type="button" className="choose-game-empty-secondary" onClick={onViewSampleTrip}>See a sample trip</button>
          </div>
          <button type="button" className="choose-game-empty-secondary" onClick={onBack}>Choose another team</button>
        </section>
        </>
      ) : (
        <>
          {[
            { title: "College Football Playoff", sectionGames: playoffGames, playoff: true },
            { title: "Bowl & Road Games", sectionGames: otherGames, playoff: false },
          ].map(({ title, sectionGames, playoff }) => (
            <section key={title} className={playoff ? "choose-game-playoff" : "choose-game-road-section"} aria-label={title}>
              <header className="choose-game-section-heading">
                {playoff ? <span className="choose-game-kicker">The road to a championship</span> : null}
                <h2>{title}</h2>
                {playoff ? <p>Follow {selectedTeam} from the first round to the national championship. Announced matchups appear here.</p> : null}
              </header>
              {sectionGames.length ? (
                <div className="choose-game-grid">
                  {sectionGames.map((game) => {
                    const { first, second, separator } = getGameTeams(game, selectedTeam);
                    const firstTeam = teams.find((team) => team.school === first);
                    const opponent = teams.find((team) => team.school === second);
                    const selected = String(game.id) === String(selectedGameId);

                    return (
                      <button
                        key={game.id}
                        type="button"
                        className={`game-destination${selected ? " is-selected" : ""}`}
                        aria-pressed={selected}
                        disabled={!game.venueId}
                        onClick={() => onSelectGame(String(game.id))}
                      >
                        <span className="game-destination-date">
                          {formatGameDate(game.startDate, game.startTimeTBD)}
                        </span>

                        {isCollegeFootballPlayoff(game) ? <span className="game-destination-round">{playoffRoundLabel(game)}</span> : null}
                        {game.eventName ? <span className="game-destination-event">{game.eventName}</span> : null}
                        <span className="game-destination-matchup">
                          <span className="game-destination-team">
                            <TeamMark team={firstTeam} />
                            <span>{first}</span>
                          </span>
                          <span className="game-destination-at">{separator}</span>
                          <span className="game-destination-team is-opponent">
                            <TeamMark team={opponent} />
                            <strong>{second}</strong>
                          </span>
                        </span>

                        <span className="game-destination-venue">
                          <span aria-hidden="true">⌖</span>
                          <span>
                            <strong>{game.venue || "Venue to be announced"}</strong>
                            <small>
                              {gameDestinationLabel(game)}
                            </small>
                          </span>
                        </span>

                        <span className="game-destination-action">
                          {!game.venueId ? "Venue to be announced" : selected ? "Selected" : "Choose this game"} <span aria-hidden="true">→</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="choose-game-status">{playoff ? `No upcoming College Football Playoff matchups are announced for ${selectedTeam} yet.` : "No other upcoming bowls or road games are listed."}</p>}
            </section>
          ))}
        </>
      )}

      {selectedGame ? (
        <div className="game-trip-setup">
          <div className="game-trip-setup-heading">
            <span className="choose-game-kicker">Start the journey</span>
            <h2>{formatGameMatchup(selectedGame, selectedTeam)}</h2>
            {selectedGame.eventName ? <p>{selectedGame.eventName}</p> : null}
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
