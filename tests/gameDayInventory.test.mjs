import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as XLSX from "../backend/node_modules/xlsx/xlsx.mjs";
import {
  analyzeGuideRows,
  scriptRelativePath,
  validateWorkbook,
} from "../backend/game-day/guideInventory.mjs";
import {
  canonicalTeams,
  noncanonicalExtras,
  normalizeTeamName,
  resolveTeamName,
  resolveTeamVenue,
} from "../backend/game-day/teamRegistry.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const workbookPath = path.join(
  repositoryRoot,
  "backend/Kickoff_Miles_Game_Day_Guide_Tracker_R6.xlsx"
);
const execFileAsync = promisify(execFile);

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function completeRow(overrides = {}) {
  return {
    School: "Texas Tech",
    "Venue ID": 3784,
    Stadium: "Galaxy Stadium",
    "Where to Tailgate": "Area",
    "When to Arrive": "Early",
    Rules: "Rule",
    "Visiting Fans": "Welcome",
    "Official Source URL": "https://example.test/tailgating",
    "Parking & Arrival": "Park here",
    "Parking Source URL": "https://example.test/parking",
    "Know Before You Go": "Policy",
    "Policies Source URL": "https://example.test/policies",
    Traditions: "Tradition",
    "Traditions Source URL": "https://example.test/traditions",
    "Last Verified": "2026-09-08",
    ...overrides,
  };
}

test("production registry has 136 unique canonical identifiers", () => {
  assert.equal(canonicalTeams.length, 136);
  assert.equal(new Set(canonicalTeams.map((team) => team.canonicalId)).size, 136);
  assert.equal(new Set(canonicalTeams.map((team) => team.displayName)).size, 136);
});

test("recognized extras remain outside the canonical launch registry", () => {
  assert.deepEqual(
    noncanonicalExtras.map((team) => team.displayName),
    ["North Dakota State", "Sacramento State"]
  );
  assert.equal(resolveTeamName("NDSU").isCanonical, false);
  assert.equal(resolveTeamName("Sac State").isCanonical, false);
});

test("aliases resolve to stable canonical identifiers", () => {
  assert.equal(resolveTeamName("Appalachian State").team.canonicalId, "app-state");
  assert.equal(resolveTeamName("Miami (FL)").team.canonicalId, "miami");
  assert.equal(resolveTeamName("Hawaii").team.canonicalId, "hawaii");
  assert.equal(normalizeTeamName("San José State"), "san jose state");
  assert.equal(resolveTeamName("unknown university").status, "unmatched");
});

test("Northwestern resolves venues by selected game first and then by week", () => {
  const martinWeeks = [1, 3];
  const ryanWeeks = [5, 6, 8, 10, 13];
  for (const week of martinWeeks) {
    assert.deepEqual(resolveTeamVenue("northwestern", { week }), {
      venueId: 5960,
      venueName: "Lanny and Sharon Martin Stadium",
    });
  }
  for (const week of ryanWeeks) {
    assert.deepEqual(resolveTeamVenue("northwestern", { week }), {
      venueId: 11823,
      venueName: "Ryan Field",
    });
  }
  assert.equal(resolveTeamVenue("northwestern", { week: 2 }), null);
  assert.deepEqual(
    resolveTeamVenue("northwestern", {
      week: 1,
      gameVenue: { venueId: 999, venueName: "Neutral Site" },
    }),
    { venueId: 999, venueName: "Neutral Site" }
  );
});

test("authoritative inventory matches approved exceptions", () => {
  const report = validateWorkbook(workbookPath);
  assert.equal(report.valid, true);
  assert.equal(report.canonicalLaunchTeamCount, 136);
  assert.equal(report.workbookRecordCount, 138);
  assert.deepEqual(report.missingCanonicalTeams, []);
  assert.deepEqual(report.extras, ["North Dakota State", "Sacramento State"]);
  assert.deepEqual(report.duplicateRecords, []);
  assert.deepEqual(report.unmatched, []);
  assert.equal(report.completeness.tailgating.totalComplete, 137);
  assert.equal(report.completeness.tailgating.canonicalComplete, 135);
  assert.equal(report.completeness.parkingArrival.totalComplete, 138);
  assert.equal(report.completeness.knowBeforeYouGo.totalComplete, 138);
  assert.equal(report.completeness.traditions.totalComplete, 138);

  const texasTech = report.records.find(
    (record) => record.canonicalId === "texas-tech"
  );
  assert.equal(texasTech.venueId, 3784);
  assert.equal(texasTech.venueName, "Galaxy Stadium");
  assert.equal(texasTech.categories.tailgating.complete, false);
  assert.equal(texasTech.categories.parkingArrival.complete, true);
  assert.equal(texasTech.categories.knowBeforeYouGo.complete, true);
  assert.equal(texasTech.categories.traditions.complete, true);

  const northwestern = report.records.find(
    (record) => record.canonicalId === "northwestern"
  );
  assert.equal(northwestern.venueId, null);
  assert.equal(
    report.exceptions.find(
      (item) => item.school === "Northwestern" && item.type === "missing-venue-id"
    ).approved,
    true
  );
});

test("negative fixtures detect duplicates, unmatched names, conflicts, and missing fields", () => {
  const report = analyzeGuideRows([
    completeRow(),
    completeRow({ School: "Texas Tech", "Venue ID": 4000 }),
    completeRow({ School: "Akron", "Venue ID": 3784 }),
    completeRow({ School: "Mystery State", "Venue ID": 5000 }),
    completeRow({ School: "Alabama", "Venue ID": 6000, Traditions: "" }),
  ]);

  assert.equal(report.valid, false);
  assert.equal(report.duplicateRecords.length, 1);
  assert.equal(report.unmatched.length, 1);
  assert.equal(report.conflictingIdentifiers.length, 1);
  assert.ok(
    report.exceptions.some(
      (item) =>
        item.school === "Alabama" &&
        item.category === "traditions" &&
        item.fields.includes("Traditions")
    )
  );
});

test("script-relative defaults resolve to backend from root and backend invocations", () => {
  const scriptUrl = pathToFileURL(
    path.join(repositoryRoot, "backend/import_tailgating_guides.mjs")
  ).href;
  const expected = path.join(repositoryRoot, "backend/tailgating_ready_for_qa.json");

  const rootInvocation = scriptRelativePath(
    scriptUrl,
    "tailgating_ready_for_qa.json"
  );
  const backendInvocation = scriptRelativePath(
    scriptUrl,
    "tailgating_ready_for_qa.json"
  );
  assert.equal(rootInvocation, expected);
  assert.equal(backendInvocation, expected);
});

test("validator resolves its default workbook from repository root and backend", async () => {
  const rootRun = await execFileAsync(
    process.execPath,
    ["backend/validate_game_day_inventory.mjs", "--json"],
    { cwd: repositoryRoot }
  );
  const backendRun = await execFileAsync(
    process.execPath,
    ["validate_game_day_inventory.mjs", "--json"],
    { cwd: path.join(repositoryRoot, "backend") }
  );

  assert.equal(JSON.parse(rootRun.stdout).valid, true);
  assert.equal(JSON.parse(backendRun.stdout).valid, true);
});

test("validation leaves its workbook byte-for-byte unchanged", async () => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "game-day-inventory-"));
  const fixturePath = path.join(temporaryDirectory, "fixture.xlsx");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([completeRow()]),
    "Tailgating Tracker"
  );
  await writeFile(fixturePath, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));

  try {
    const before = await readFile(fixturePath);
    validateWorkbook(fixturePath);
    const after = await readFile(fixturePath);
    assert.equal(digest(after), digest(before));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
