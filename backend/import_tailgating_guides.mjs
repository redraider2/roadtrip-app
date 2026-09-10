import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const apply = process.argv.includes("--apply");
const dataArg = process.argv.find((arg) => arg.endsWith(".json"));
const dataPath = path.resolve(dataArg || "../tailgating_ready_for_qa.json");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}
if (!process.env.CFBD_API_KEY) {
  throw new Error("CFBD_API_KEY is not configured");
}
if (!fs.existsSync(dataPath)) {
  throw new Error(`Data file not found: ${dataPath}`);
}

const guides = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function optionalJsonArray(value) {
  if (!Array.isArray(value)) return null;

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return items.length > 0 ? JSON.stringify(items) : null;
}

const cfbdRes = await fetch("https://api.collegefootballdata.com/teams/fbs", {
  headers: { Authorization: `Bearer ${process.env.CFBD_API_KEY}` },
});

if (!cfbdRes.ok) {
  throw new Error(`CFBD teams request failed: ${cfbdRes.status} ${await cfbdRes.text()}`);
}

const teams = await cfbdRes.json();
const teamBySchool = new Map(teams.map((team) => [team.school, team]));

const mapped = [];
const skipped = [];

for (const guide of guides) {
  const team = teamBySchool.get(guide.school);
  const venueId = team?.location?.id ?? null;
  const cfbdVenueName = team?.location?.name ?? null;

  if (!venueId) {
    skipped.push({ school: guide.school, reason: "No CFBD venue ID found" });
    continue;
  }

  mapped.push({
    ...guide,
    venueId,
    cfbdVenueName,
    venueName: guide.venueName || cfbdVenueName,
  });
}

console.log(`Ready-for-QA guides in file: ${guides.length}`);
console.log(`Mapped to CFBD venue IDs: ${mapped.length}`);
console.log(`Skipped: ${skipped.length}`);

for (const item of mapped) {
  const mismatch =
    item.venueName &&
    item.cfbdVenueName &&
    item.venueName.toLowerCase() !== item.cfbdVenueName.toLowerCase();

  console.log(
    `${item.school}: venue_id=${item.venueId} | ` +
    `tracker="${item.venueName}" | CFBD="${item.cfbdVenueName}"` +
    (mismatch ? "  [NAME CHECK]" : "")
  );
}

if (skipped.length) {
  console.log("\nSkipped schools:");
  console.table(skipped);
}

if (!apply) {
  console.log("\nDRY RUN ONLY — no database changes made.");
  console.log("If the mapping looks right, rerun with --apply.");
  process.exit(0);
}

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await db.connect();

try {
  await db.query("BEGIN");

  let upserted = 0;

  for (const guide of mapped) {
    await db.query(
      `INSERT INTO tailgating_guides (
         school,
         venue_id,
         venue_name,
         where_to_tailgate,
         when_to_arrive,
         rules,
         visiting_fans,
         official_url,
         parking_arrival,
         parking_url,
         know_before_you_go,
         policies_url,
         traditions,
         traditions_url,
         last_verified
       )
       VALUES (
         $1,$2,$3,
         COALESCE($4::jsonb, '[]'::jsonb),
         COALESCE($5::jsonb, '[]'::jsonb),
         COALESCE($6::jsonb, '[]'::jsonb),
         COALESCE($7::jsonb, '[]'::jsonb),$8,
         COALESCE($9::jsonb, '[]'::jsonb),$10,
         COALESCE($11::jsonb, '[]'::jsonb),$12,
         COALESCE($13::jsonb, '[]'::jsonb),$14,$15
       )
       ON CONFLICT (venue_id) DO UPDATE SET
         school = EXCLUDED.school,
         venue_name = EXCLUDED.venue_name,
         where_to_tailgate = CASE
           WHEN $4::jsonb IS NULL THEN tailgating_guides.where_to_tailgate
           ELSE EXCLUDED.where_to_tailgate
         END,
         when_to_arrive = CASE
           WHEN $5::jsonb IS NULL THEN tailgating_guides.when_to_arrive
           ELSE EXCLUDED.when_to_arrive
         END,
         rules = CASE
           WHEN $6::jsonb IS NULL THEN tailgating_guides.rules
           ELSE EXCLUDED.rules
         END,
         visiting_fans = CASE
           WHEN $7::jsonb IS NULL THEN tailgating_guides.visiting_fans
           ELSE EXCLUDED.visiting_fans
         END,
         official_url = COALESCE(EXCLUDED.official_url, tailgating_guides.official_url),
         parking_arrival = CASE
           WHEN $9::jsonb IS NULL THEN tailgating_guides.parking_arrival
           ELSE EXCLUDED.parking_arrival
         END,
         parking_url = COALESCE(EXCLUDED.parking_url, tailgating_guides.parking_url),
         know_before_you_go = CASE
           WHEN $11::jsonb IS NULL THEN tailgating_guides.know_before_you_go
           ELSE EXCLUDED.know_before_you_go
         END,
         policies_url = COALESCE(EXCLUDED.policies_url, tailgating_guides.policies_url),
         traditions = CASE
           WHEN $13::jsonb IS NULL THEN tailgating_guides.traditions
           ELSE EXCLUDED.traditions
         END,
         traditions_url = COALESCE(EXCLUDED.traditions_url, tailgating_guides.traditions_url),
         last_verified = COALESCE(EXCLUDED.last_verified, tailgating_guides.last_verified),
         updated_at = NOW()`,
      [
        guide.school,
        guide.venueId,
        guide.venueName,
        optionalJsonArray(guide.where),
        optionalJsonArray(guide.arrival),
        optionalJsonArray(guide.rules),
        optionalJsonArray(guide.visitors),
        optionalText(guide.sourceUrl),
        optionalJsonArray(guide.parkingArrival),
        optionalText(guide.parkingSourceUrl),
        optionalJsonArray(guide.knowBeforeYouGo),
        optionalText(guide.policiesSourceUrl),
        optionalJsonArray(guide.traditions),
        optionalText(guide.traditionsSourceUrl),
        optionalText(guide.lastVerified),
      ]
    );
    upserted += 1;
  }

  await db.query("COMMIT");

  const verify = await db.query(
    `SELECT school, venue_id, venue_name, last_verified
     FROM tailgating_guides
     ORDER BY school`
  );

  console.log(`\nBulk upload committed. Upserted: ${upserted}`);
  console.table(verify.rows);
} catch (err) {
  await db.query("ROLLBACK");
  console.error("Bulk upload rolled back:", err);
  process.exitCode = 1;
} finally {
  await db.end();
}
