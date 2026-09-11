const originalFetch = global.fetch;

if (typeof originalFetch !== "function") {
  throw new Error("Global fetch is unavailable; CFBD fallback cannot be installed");
}

const CFBD_FBS_TEAMS_URL = "https://api.collegefootballdata.com/teams/fbs";
const ESPN_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500";

function fallbackLogo(team) {
  if (!Array.isArray(team?.logos)) return [];

  return team.logos
    .map((logo) => (typeof logo === "string" ? logo : logo?.href))
    .filter(Boolean);
}

async function loadEspnTeamDirectory() {
  const response = await originalFetch(ESPN_TEAMS_URL);

  if (!response.ok) {
    throw new Error(`ESPN teams request failed with ${response.status}`);
  }

  const data = await response.json();
  const entries = data?.sports?.[0]?.leagues?.[0]?.teams || data?.teams || [];

  return entries
    .map((entry) => entry?.team || entry)
    .filter(Boolean);
}

async function buildLocalTeamsResponse() {
  const { canonicalTeams, resolveTeamName } = await import(
    "../game-day/teamRegistry.mjs"
  );

  let espnTeams = [];

  try {
    espnTeams = await loadEspnTeamDirectory();
  } catch (err) {
    console.warn("ESPN team enrichment unavailable; using initials fallback.", err);
  }

  const espnByCanonicalId = new Map();

  for (const espnTeam of espnTeams) {
    const candidateNames = [
      espnTeam.location,
      espnTeam.shortDisplayName,
      espnTeam.displayName,
      espnTeam.name,
      espnTeam.nickname,
    ].filter(Boolean);

    for (const candidate of candidateNames) {
      const resolution = resolveTeamName(candidate);
      if (resolution.status !== "matched") continue;

      espnByCanonicalId.set(resolution.team.canonicalId, espnTeam);
      break;
    }
  }

  const teams = canonicalTeams.map((team) => {
    const espnTeam = espnByCanonicalId.get(team.canonicalId);

    return {
      id: espnTeam?.id || team.canonicalId,
      school: team.displayName,
      mascot: espnTeam?.name || espnTeam?.nickname || null,
      abbreviation: espnTeam?.abbreviation || null,
      conference: null,
      color: espnTeam?.color ? `#${String(espnTeam.color).replace(/^#/, "")}` : null,
      alt_color: espnTeam?.alternateColor
        ? `#${String(espnTeam.alternateColor).replace(/^#/, "")}`
        : null,
      logos: fallbackLogo(espnTeam),
    };
  });

  return new Response(JSON.stringify(teams), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Kickoff-Miles-Fallback": espnTeams.length
        ? "local-registry-plus-espn"
        : "local-team-registry",
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
      `CFBD FBS teams unavailable (${response.status}); using enriched fallback.`,
      body
    );

    return buildLocalTeamsResponse();
  } catch (err) {
    console.warn(
      "CFBD FBS teams request failed; using enriched fallback.",
      err
    );

    return buildLocalTeamsResponse();
  }
};
