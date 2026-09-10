import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import {
  canonicalTeams,
  noncanonicalExtras,
  resolveTeamName,
  teamVenueExceptions,
} from "./teamRegistry.mjs";

export const AUTHORITATIVE_WORKBOOK = "Kickoff_Miles_Game_Day_Guide_Tracker_R6.xlsx";
export const WORKSHEET_NAME = "Tailgating Tracker";

export function scriptRelativePath(importMetaUrl, defaultFilename, cliPath) {
  if (cliPath) return path.resolve(cliPath);
  return path.join(path.dirname(fileURLToPath(importMetaUrl)), defaultFilename);
}

function cellText(value) {
  return String(value ?? "").trim();
}

function cellLines(value) {
  return cellText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const categoryDefinitions = Object.freeze({
  tailgating: Object.freeze({
    fields: ["Where to Tailgate", "When to Arrive", "Rules", "Visiting Fans"],
    sourceField: "Official Source URL",
  }),
  parkingArrival: Object.freeze({
    fields: ["Parking & Arrival"],
    sourceField: "Parking Source URL",
  }),
  knowBeforeYouGo: Object.freeze({
    fields: ["Know Before You Go"],
    sourceField: "Policies Source URL",
  }),
  traditions: Object.freeze({
    fields: ["Traditions"],
    sourceField: "Traditions Source URL",
  }),
});

function analyzeCategory(row, definition) {
  const incompleteFields = definition.fields.filter(
    (field) => cellLines(row[field]).length === 0
  );
  const sourceUrl = cellText(row[definition.sourceField]);

  return {
    complete: incompleteFields.length === 0,
    incompleteFields,
    sourceUrlPresent: Boolean(sourceUrl),
  };
}

export function analyzeGuideRows(rows) {
  const records = [];
  const unmatched = [];
  const ambiguous = [];
  const recordsByCanonicalId = new Map();
  const venueOwners = new Map();

  for (const [index, row] of rows.entries()) {
    const school = cellText(row.School);
    if (!school) continue;

    const resolution = resolveTeamName(school);
    if (resolution.status === "unmatched") {
      unmatched.push({ row: index + 2, school });
      continue;
    }
    if (resolution.status === "ambiguous") {
      ambiguous.push({ row: index + 2, school });
      continue;
    }

    const venueIdText = cellText(row["Venue ID"]);
    const venueId = venueIdText ? Number(venueIdText) : null;
    const categories = Object.fromEntries(
      Object.entries(categoryDefinitions).map(([name, definition]) => [
        name,
        analyzeCategory(row, definition),
      ])
    );
    const record = {
      row: index + 2,
      school,
      canonicalId: resolution.team.canonicalId,
      isCanonical: resolution.isCanonical,
      venueId: Number.isFinite(venueId) ? venueId : null,
      venueName: cellText(row.Stadium),
      verificationDatePresent: Boolean(cellText(row["Last Verified"])),
      categories,
    };

    records.push(record);
    const sameTeam = recordsByCanonicalId.get(record.canonicalId) ?? [];
    recordsByCanonicalId.set(record.canonicalId, [...sameTeam, record]);

    if (record.venueId != null) {
      const owners = venueOwners.get(record.venueId) ?? [];
      venueOwners.set(record.venueId, [...owners, record.canonicalId]);
    }
  }

  const duplicateRecords = [...recordsByCanonicalId.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([canonicalId, matches]) => ({
      canonicalId,
      schools: matches.map((record) => record.school),
    }));
  const conflictingIdentifiers = [...venueOwners.entries()]
    .filter(([, owners]) => new Set(owners).size > 1)
    .map(([venueId, owners]) => ({ venueId, canonicalIds: [...new Set(owners)] }));
  const missingCanonicalTeams = canonicalTeams
    .filter((team) => !recordsByCanonicalId.has(team.canonicalId))
    .map((team) => team.displayName);
  const extras = records
    .filter((record) => !record.isCanonical)
    .map((record) => record.school)
    .sort();
  const missingVenueIds = records
    .filter((record) => record.venueId == null)
    .map((record) => record.school);
  const missingVenueNames = records
    .filter((record) => !record.venueName)
    .map((record) => record.school);

  const completeness = Object.fromEntries(
    Object.keys(categoryDefinitions).map((category) => {
      const totalComplete = records.filter(
        (record) => record.categories[category].complete
      ).length;
      const canonicalComplete = records.filter(
        (record) => record.isCanonical && record.categories[category].complete
      ).length;
      return [category, { totalComplete, canonicalComplete }];
    })
  );

  const exceptions = records
    .flatMap((record) => {
      const items = [];
      for (const [category, result] of Object.entries(record.categories)) {
        if (!result.complete) {
          items.push({
            school: record.school,
            type: "incomplete-category",
            category,
            fields: result.incompleteFields,
            approved:
              record.canonicalId === "texas-tech" && category === "tailgating",
          });
        }
        if (!result.sourceUrlPresent) {
          items.push({
            school: record.school,
            type: "missing-source-url",
            category,
            approved:
              record.canonicalId === "texas-tech" && category === "tailgating",
          });
        }
      }
      if (record.venueId == null) {
        items.push({
          school: record.school,
          type: "missing-venue-id",
          approved: record.canonicalId === "northwestern",
        });
      }
      if (!record.verificationDatePresent) {
        items.push({
          school: record.school,
          type: "missing-verification-date",
          approved: false,
        });
      }
      return items;
    })
    .sort((a, b) =>
      `${a.school}:${a.type}:${a.category ?? ""}`.localeCompare(
        `${b.school}:${b.type}:${b.category ?? ""}`
      )
    );

  const sourceCoverage = Object.fromEntries(
    Object.keys(categoryDefinitions).map((category) => [
      category,
      records.filter((record) => record.categories[category].sourceUrlPresent).length,
    ])
  );
  const verificationDateCoverage = records.filter(
    (record) => record.verificationDatePresent
  ).length;
  const unexpectedExceptions = exceptions.filter((item) => !item.approved);
  const unexpectedFailures = [
    ...missingCanonicalTeams.map((school) => ({ type: "missing-canonical", school })),
    ...duplicateRecords.map((item) => ({ type: "duplicate", ...item })),
    ...unmatched.map((item) => ({ type: "unmatched", ...item })),
    ...ambiguous.map((item) => ({ type: "ambiguous", ...item })),
    ...conflictingIdentifiers.map((item) => ({ type: "identifier-conflict", ...item })),
    ...missingVenueNames.map((school) => ({ type: "missing-venue-name", school })),
    ...unexpectedExceptions,
  ];

  return {
    canonicalLaunchTeamCount: canonicalTeams.length,
    recognizedExtraCount: noncanonicalExtras.length,
    workbookRecordCount: records.length + unmatched.length + ambiguous.length,
    uniqueResolvedRecordCount: recordsByCanonicalId.size,
    missingCanonicalTeams,
    extras,
    duplicateRecords,
    unmatched,
    ambiguous,
    missingStableIdentifiers: [...unmatched, ...ambiguous],
    missingVenueIds,
    missingVenueNames,
    conflictingIdentifiers,
    completeness,
    sourceCoverage,
    verificationDateCoverage,
    venueSpecialCases: teamVenueExceptions,
    exceptions,
    unexpectedFailures,
    valid: unexpectedFailures.length === 0,
    records,
  };
}

export function validateWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[WORKSHEET_NAME];
  if (!sheet) throw new Error(`Could not find ${WORKSHEET_NAME} worksheet.`);

  return analyzeGuideRows(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
}
