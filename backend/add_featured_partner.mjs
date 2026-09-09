import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const args = process.argv.slice(2);
const data = {};

for (const arg of args) {
  const [key, ...rest] = arg.split("=");
  data[key.replace(/^--/, "")] = rest.join("=");
}

const required = ["venueId", "gameId", "school", "businessName"];

for (const field of required) {
  if (!data[field]) {
    console.error(`Missing required field: --${field}`);
    process.exit(1);
  }
}

const venueId = Number(data.venueId);
const gameId = Number(data.gameId);

if (!Number.isInteger(venueId) || !Number.isInteger(gameId)) {
  console.error("venueId and gameId must be valid integers.");
  process.exit(1);
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

try {
  const existing = await db.query(
    `SELECT id, business_name
     FROM featured_partners
     WHERE venue_id = $1
       AND game_id = $2
       AND is_active = TRUE`,
    [venueId, gameId]
  );

  if (existing.rows.length) {
    console.error(
      `STOPPED: This Game Weekend already has an active Featured Partner: ${existing.rows[0].business_name}`
    );
    process.exitCode = 1;
  } else {
    const result = await db.query(
      `INSERT INTO featured_partners (
        venue_id,
        game_id,
        school,
        business_name,
        category,
        location_text,
        description,
        offer_text,
        website_url,
        directions_url,
        image_url,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
      RETURNING id, venue_id, game_id, school, business_name, is_active`,
      [
        venueId,
        gameId,
        data.school,
        data.businessName,
        data.category || null,
        data.location || null,
        data.description || null,
        data.offer || null,
        data.website || null,
        data.directions || null,
        data.image || null,
      ]
    );

    console.log("Featured Partner activated ✅");
    console.table(result.rows);
  }
} finally {
  await db.end();
}
