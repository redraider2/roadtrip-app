import { useMemo, useState } from "react";

export default function ChooseTeamExperience({
  error,
  loading,
  onBack,
  onSelectTeam,
  selectedTeam,
  teams,
}) {
  const [query, setQuery] = useState("");

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return teams;

    return teams.filter((team) =>
      [team.school, team.mascot, team.abbreviation, team.conference]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [query, teams]);

  return (
    <section className="choose-team-experience" aria-labelledby="choose-team-title">
      <header className="choose-team-header">
        <button type="button" className="choose-team-back" onClick={onBack}>
          <span aria-hidden="true">←</span> Home
        </button>
        <span className="choose-team-brand">Kickoff Miles</span>
      </header>

      <div className="choose-team-heading">
        <span className="choose-team-kicker">Start your road trip</span>
        <h1 id="choose-team-title">Choose Your Team</h1>
        <p>Who are we hitting the road for?</p>
      </div>

      <div className="choose-team-search" role="search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Search schools, mascots, or conferences"
          aria-label="Search college football teams"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")}>
            Clear
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="choose-team-status">Loading college football teams…</p>
      ) : error ? (
        <p className="error-state">{error}</p>
      ) : filteredTeams.length === 0 ? (
        <p className="choose-team-status">
          No teams match “{query}”. Try a school, mascot, or conference.
        </p>
      ) : (
        <>
          <p className="choose-team-count">
            {filteredTeams.length} {filteredTeams.length === 1 ? "team" : "teams"}
          </p>
          <div className="choose-team-grid">
            {filteredTeams.map((team) => {
              const logo = team.logos?.[0];

              return (
                <button
                  key={team.id}
                  type="button"
                  className={`team-choice${
                    selectedTeam === team.school ? " is-selected" : ""
                  }`}
                  aria-pressed={selectedTeam === team.school}
                  onClick={() => onSelectTeam(team.school)}
                >
                  <span className="team-choice-mark">
                    {logo ? (
                      <img src={logo} alt="" aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">{team.school.slice(0, 2)}</span>
                    )}
                  </span>
                  <span className="team-choice-copy">
                    <strong>{team.school}</strong>
                    <span>
                      {[team.mascot, team.conference].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="team-choice-arrow" aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
