const canonicalDisplayNames = `Air Force
Akron
Alabama
App State
Arizona
Arizona State
Arkansas
Arkansas State
Army
Auburn
BYU
Ball State
Baylor
Boise State
Boston College
Bowling Green
Buffalo
California
Central Michigan
Charlotte
Cincinnati
Clemson
Coastal Carolina
Colorado
Colorado State
Delaware
Duke
East Carolina
Eastern Michigan
Florida
Florida Atlantic
Florida International
Florida State
Fresno State
Georgia
Georgia Southern
Georgia State
Georgia Tech
Hawai'i
Houston
Illinois
Indiana
Iowa
Iowa State
Jacksonville State
James Madison
Kansas
Kansas State
Kennesaw State
Kent State
Kentucky
LSU
Liberty
Louisiana
Louisiana Tech
Louisville
Marshall
Maryland
Massachusetts
Memphis
Miami
Miami (OH)
Michigan
Michigan State
Middle Tennessee
Minnesota
Mississippi State
Missouri
Missouri State
NC State
Navy
Nebraska
Nevada
New Mexico
New Mexico State
North Carolina
North Texas
Northern Illinois
Northwestern
Notre Dame
Ohio
Ohio State
Oklahoma
Oklahoma State
Old Dominion
Ole Miss
Oregon
Oregon State
Penn State
Pittsburgh
Purdue
Rice
Rutgers
SMU
Sam Houston
San Diego State
San José State
South Alabama
South Carolina
South Florida
Southern Miss
Stanford
Syracuse
TCU
Temple
Tennessee
Texas
Texas A&M
Texas State
Texas Tech
Toledo
Troy
Tulane
Tulsa
UAB
UCF
UCLA
UConn
UL Monroe
UNLV
USC
UTEP
UTSA
Utah
Utah State
Vanderbilt
Virginia
Virginia Tech
Wake Forest
Washington
Washington State
West Virginia
Western Kentucky
Western Michigan
Wisconsin
Wyoming`.split("\n");

export function normalizeTeamName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function canonicalId(displayName) {
  return normalizeTeamName(displayName).replace(/\s+/g, "-");
}

const aliasesByDisplayName = {
  "App State": ["Appalachian State"],
  BYU: ["Brigham Young"],
  California: ["Cal"],
  "Florida International": ["FIU"],
  "Hawai'i": ["Hawaii"],
  LSU: ["Louisiana State"],
  Massachusetts: ["UMass"],
  Miami: ["Miami (FL)", "Miami FL"],
  "Miami (OH)": ["Miami Ohio", "Miami University"],
  "Middle Tennessee": ["Middle Tennessee State", "MTSU"],
  "NC State": ["North Carolina State", "N.C. State"],
  "Ole Miss": ["Mississippi"],
  "Sam Houston": ["Sam Houston State"],
  "San José State": ["San Jose State", "SJSU"],
  UConn: ["Connecticut"],
  "UL Monroe": ["Louisiana Monroe", "Louisiana-Monroe", "ULM"],
};

export const canonicalTeams = Object.freeze(
  canonicalDisplayNames.map((displayName) =>
    Object.freeze({
      canonicalId: canonicalId(displayName),
      displayName,
      aliases: Object.freeze(aliasesByDisplayName[displayName] ?? []),
    })
  )
);

export const noncanonicalExtras = Object.freeze([
  Object.freeze({
    canonicalId: "north-dakota-state",
    displayName: "North Dakota State",
    aliases: Object.freeze(["NDSU"]),
  }),
  Object.freeze({
    canonicalId: "sacramento-state",
    displayName: "Sacramento State",
    aliases: Object.freeze(["Sac State"]),
  }),
]);

function buildNameIndex(teams) {
  const index = new Map();

  for (const team of teams) {
    for (const name of [team.displayName, ...team.aliases]) {
      const normalized = normalizeTeamName(name);
      const matches = index.get(normalized) ?? [];
      if (!matches.includes(team)) index.set(normalized, [...matches, team]);
    }
  }

  return index;
}

const canonicalNameIndex = buildNameIndex(canonicalTeams);
const recognizedNameIndex = buildNameIndex([
  ...canonicalTeams,
  ...noncanonicalExtras,
]);

export function resolveTeamName(value, { includeExtras = true } = {}) {
  const normalized = normalizeTeamName(value);
  const index = includeExtras ? recognizedNameIndex : canonicalNameIndex;
  const matches = index.get(normalized) ?? [];

  if (matches.length === 1) {
    const team = matches[0];
    return {
      status: "matched",
      team,
      isCanonical: canonicalNameIndex.get(normalized)?.includes(team) ?? false,
    };
  }

  return {
    status: matches.length > 1 ? "ambiguous" : "unmatched",
    matches,
    normalized,
  };
}

export function indexExternalTeamsByCanonicalName(externalTeams) {
  const index = new Map();

  for (const externalTeam of externalTeams) {
    const resolution = resolveTeamName(externalTeam?.school);
    if (resolution.status !== "matched") continue;

    const current = index.get(resolution.team.canonicalId) ?? [];
    index.set(resolution.team.canonicalId, [...current, externalTeam]);
  }

  return index;
}

export const teamVenueExceptions = Object.freeze({
  northwestern: Object.freeze({
    strategy: "game-week",
    venuesByWeek: Object.freeze({
      1: Object.freeze({
        venueId: 5960,
        venueName: "Lanny and Sharon Martin Stadium",
      }),
      3: Object.freeze({
        venueId: 5960,
        venueName: "Lanny and Sharon Martin Stadium",
      }),
      5: Object.freeze({ venueId: 11823, venueName: "Ryan Field" }),
      6: Object.freeze({ venueId: 11823, venueName: "Ryan Field" }),
      8: Object.freeze({ venueId: 11823, venueName: "Ryan Field" }),
      10: Object.freeze({ venueId: 11823, venueName: "Ryan Field" }),
      13: Object.freeze({ venueId: 11823, venueName: "Ryan Field" }),
    }),
  }),
});

export function resolveTeamVenue(canonicalTeamId, { week, gameVenue } = {}) {
  if (gameVenue?.venueId) return gameVenue;

  const exception = teamVenueExceptions[canonicalTeamId];
  if (!exception || week == null) return null;

  return exception.venuesByWeek[Number(week)] ?? null;
}
