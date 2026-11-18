// Keep schedule retrieval and trip eligibility separate from provider home/away labels.
async function loadTeamSchedule({ team, year, includePostseason, fetchGames, venueName }) {
  const url = new URL("https://api.collegefootballdata.com/games");
  url.searchParams.set("year", year);
  url.searchParams.set("team", team);
  url.searchParams.set("seasonType", includePostseason ? "both" : "regular");
  const games = await fetchGames(url);
  const unique = new Map();
  for (const game of games) {
    if (game.homeTeam !== team && game.awayTeam !== team) continue;
    unique.set(String(game.id), {
      id: game.id,
      season: game.season,
      seasonType: game.seasonType || "regular",
      week: game.week,
      startDate: game.startDate,
      startTimeTBD: game.startTimeTBD,
      completed: game.completed,
      playoff: game.playoff || null,
      conferenceGame: game.conferenceGame,
      neutralSite: game.neutralSite,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: venueName(game.venueId, game.venue),
      venueId: game.venueId,
      bowlName: game.playoff?.bowlName || game.bowlName || null,
      eventName: game.playoff?.bowlName || game.bowlName || game.notes || null,
      isAwayGame: game.awayTeam === team && !game.neutralSite,
    });
  }
  return [...unique.values()].sort((a, b) =>
    (Date.parse(a.startDate) || Infinity) - (Date.parse(b.startDate) || Infinity)
  );
}

function filterTeamSchedule(games, { awayOnly, roadOnly }) {
  if (roadOnly) return games.filter(game =>
    game.isAwayGame || game.neutralSite || game.seasonType === "postseason"
  );
  return awayOnly ? games.filter(game => game.isAwayGame) : games;
}

module.exports = { loadTeamSchedule, filterTeamSchedule };
