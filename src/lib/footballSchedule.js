export function getUpcomingGames(games, now = new Date()) {
  return games.filter((game) => {
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
