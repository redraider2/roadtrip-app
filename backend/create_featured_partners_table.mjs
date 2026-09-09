import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

async function main() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS featured_partners (
        id SERIAL PRIMARY KEY,
        venue_id INTEGER NOT NULL,
        school TEXT,
        business_name TEXT NOT NULL,
        category TEXT,
        location_text TEXT,
        description TEXT,
        offer_text TEXT,
        website_url TEXT,
        directions_url TEXT,
        image_url TEXT,
        game_id INTEGER,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS featured_partners_venue_idx
      ON featured_partners (venue_id, is_active);
    `);

    console.log("featured_partners table ready ✅");
  } catch (err) {
    console.error("Failed to create featured_partners table:", err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
