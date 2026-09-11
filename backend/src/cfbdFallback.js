const originalFetch = global.fetch;

if (typeof originalFetch !== "function") {
  throw new Error("Global fetch is unavailable; CFBD fallback cannot be installed");
}

const CFBD_FBS_TEAMS_URL = "https://api.collegefootballdata.com/teams/fbs";

async function buildLocalTeamsResponse() {
  const { canonicalTeams } = await import("../game-day/teamRegistry.mjs");

  const teams = canonicalTeams.map((team) => ({
    id: team.canonicalId,
    school: team.displayName,
    mascot: null,
    abbreviation: null,
    conference: null,
    color: null,
    alt_color: null,
    logos: [],
  }));

  return new Response(JSON.stringify(teams), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Kickoff-Miles-Fallback": "local-team-registry",
    },
  });
}

global.fetch = async function kickoffMilesFetch(input, init) {
  const url = typeof input === "string" ? input : input?.url;

  if (url !== CFBD_FBS_TEAMS_URL) {
    return originalFetch(input, init);
  }

  try {
    const response = await originalFetch(input, init);

    if (response.ok) {
      return response;
    }

    const body = await response.clone().text().catch(() => "");
    console.warn(
      `CFBD FBS teams unavailable (${response.status}); using local canonical registry.`,
      body
    );

    return buildLocalTeamsResponse();
  } catch (err) {
    console.warn(
      "CFBD FBS teams request failed; using local canonical registry.",
      err
    );

    return buildLocalTeamsResponse();
  }
};
