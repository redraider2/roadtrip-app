const originalFetch = global.fetch;

if (typeof originalFetch !== "function") {
  throw new Error("Global fetch is unavailable; CFBD fallback cannot be installed");
}

const CFBD_FBS_TEAMS_URL = "https://api.collegefootballdata.com/teams/fbs";
const CFBD_GAMES_URL = "https://api.collegefootballdata.com/games";
const ESPN_TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=500";

const GAME_SNAPSHOTS = new Map([
  [
    "2026:Houston",
    [
      {
        id: 401856811,
        season: 2026,
        week: 3,
        startDate: "2026-09-19T00:00:00.000Z",
        startTimeTBD: false,
        conferenceGame: true,
        neutralSite: false,
        homeTeam: "Texas Tech",
        awayTeam: "Houston",
        venue: "Jones AT&T Stadium",
        venueId: 3784,
      },
      {
        id: 401856806,
        season: 2026,
        week: 4,
        startDate: "2026-09-26T04:00:00.000Z",
        startTimeTBD: true,
        conferenceGame: false,
        neutralSite: false,
        homeTeam: "Georgia Southern",
        awayTeam: "Houston",
        venue: "Allen E. Paulson Stadium",
        venueId: 3608,
      },
      {
        id: 401856837,
        season: 2026,
        week: 6,
        startDate: "2026-10-10T04:00:00.000Z",
        startTimeTBD: true,
        conferenceGame: true,
        neutralSite: false,
        homeTeam: "Kansas State",
        awayTeam: "Houston",
        venue: "Bill Snyder Family Stadium",
        venueId: 3636,
      },
      {
        id: 401856860,
        season: 2026,
        week: 11,
        startDate: "2026-11-14T05:00:00.000Z",
        startTimeTBD: true,
        conferenceGame: true,
        neutralSite: false,
        homeTeam: "Utah",
        awayTeam: "Houston",
        venue: "Rice-Eccles Stadium",
        venueId: 587,
      },
      {
        id: 401856868,
        season: 2026,
        week: 12,
        startDate: "2026-11-21T05:00:00.000Z",
        startTimeTBD: true,
        conferenceGame: true,
        neutralSite: false,
        homeTeam: "Colorado",
        awayTeam: "Houston",
        venue: "Folsom Field",
        venueId: 3726,
      },
    ],
  ],
]);

function requestUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input.url === "string") return input.url;
  return "";
}

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

function buildGameSnapshotResponse(url) {
  const parsed = new URL(url);
  const team = parsed.searchParams.get("team") || "";
  const year = parsed.searchParams.get("year") || "";
  const snapshot = GAME_SNAPSHOTS.get(`${year}:${team}`);

  if (!snapshot) return null;

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Kickoff-Miles-Fallback": "local-game-snapshot",
    },
  });
}

global.fetch = async function kickoffMilesFetch(input, init) {
  const url = requestUrl(input);

  const isTeamsRequest = url === CFBD_FBS_TEAMS_URL;
  const isGamesRequest = url.startsWith(`${CFBD_GAMES_URL}?`);

  if (!isTeamsRequest && !isGamesRequest) {
    return originalFetch(input, init);
  }

  try {
    const response = await originalFetch(input, init);

    if (response.ok) {
      return response;
    }

    const body = await response.clone().text().catch(() => "");

    if (isTeamsRequest) {
      console.warn(
        `CFBD FBS teams unavailable (${response.status}); using enriched fallback.`,
        body
      );
      return buildLocalTeamsResponse();
    }

    const snapshotResponse = buildGameSnapshotResponse(url);
    if (snapshotResponse) {
      console.warn(
        `CFBD games unavailable (${response.status}); using local schedule snapshot.`,
        body
      );
      return snapshotResponse;
    }

    return response;
  } catch (err) {
    if (isTeamsRequest) {
      console.warn(
        "CFBD FBS teams request failed; using enriched fallback.",
        err
      );
      return buildLocalTeamsResponse();
    }

    const snapshotResponse = buildGameSnapshotResponse(url);
    if (snapshotResponse) {
      console.warn(
        "CFBD games request failed; using local schedule snapshot.",
        err
      );
      return snapshotResponse;
    }

    throw err;
  }
};
