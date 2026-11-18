export function getUpcomingGames(games, now = new Date()) {
  return games.filter((game) => {
    if (game.completed) return false;
    if (!game.startDate) return true;

    const kickoff = new Date(game.startDate);
    // An unannounced date cannot reliably identify a past game.
    if (Number.isNaN(kickoff.getTime())) return true;

    if (game.startTimeTBD) {
      // TBD timestamps are placeholders; retain the game through its listed day.
      const gameDay = game.startDate.slice(0, 10);
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return gameDay >= today;
    }

    return kickoff.getTime() > now.getTime();
  });
}

// For neutral games the selected team leads, regardless of its provider designation.
export function getGameTeams(game, selectedTeam) {
  if (game.neutralSite && game.homeTeam === selectedTeam) {
    return { first: game.homeTeam, second: game.awayTeam, separator: "vs" };
  }
  return { first: game.awayTeam, second: game.homeTeam, separator: game.neutralSite ? "vs" : "at" };
}

export function formatGameMatchup(game, selectedTeam) {
  const { first, second, separator } = getGameTeams(game, selectedTeam);
  return `${first} ${separator === "at" ? "@" : separator} ${second}`;
}

export function gameDestinationLabel(game) {
  const type = game.seasonType === "postseason" ? "Postseason" : "";
  if (type && !game.neutralSite) return "Postseason destination";
  return [type, game.neutralSite ? "Neutral-site destination" : "Away-game destination"].filter(Boolean).join(" · ");
}

export function isCollegeFootballPlayoff(game) {
  return game.playoff?.competition === "cfp" ||
    /\bCFP\b|college football playoff/i.test(game.eventName || "");
}

export function playoffRoundLabel(game) {
  const rounds = {
    first_round: "First Round",
    quarterfinal: "Quarterfinal",
    semifinal: "Semifinal",
    championship: "National Championship",
  };
  return game.playoff?.roundName || rounds[game.playoff?.round] || "College Football Playoff";
}
