import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const args = process.argv.slice(2);
const data = {};

for (const arg of args) {
  const [key, ...rest] = arg.split("=");
  data[key.replace(/^--/, "")] = rest.join("=");
}

if (!data.id) {
  console.error("Missing required field: --id");
  process.exit(1);
}

const id = Number(data.id);

if (!Number.isInteger(id)) {
  console.error("id must be a valid integer.");
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
  const current = await db.query(
    `SELECT id, business_name, venue_id, game_id, offer_text,
            website_url, is_active
     FROM featured_partners
     WHERE id = $1`,
    [id]
  );

  if (!current.rows.length) {
    console.error(`STOPPED: Featured Partner id ${id} not found.`);
    process.exitCode = 1;
  } else if (data.deactivate === "true") {
    const result = await db.query(
      `UPDATE featured_partners
       SET is_active = FALSE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, business_name, venue_id, game_id, is_active`,
      [id]
    );

    console.log("Featured Partner deactivated ✅");
    console.table(result.rows);
  } else {
    const allowed = {
      businessName: "business_name",
      category: "category",
      location: "location_text",
      description: "description",
      offer: "offer_text",
      website: "website_url",
      directions: "directions_url",
      image: "image_url",
    };

    const updates = [];
    const values = [];

    for (const [argName, column] of Object.entries(allowed)) {
      if (data[argName] !== undefined) {
        values.push(data[argName] || null);
        updates.push(`${column} = $${values.length}`);
      }
    }

    if (!updates.length) {
      console.log("No changes requested.");
      console.table(current.rows);
    } else {
      values.push(id);

      const result = await db.query(
        `UPDATE featured_partners
         SET ${updates.join(", ")},
             updated_at = NOW()
         WHERE id = $${values.length}
         RETURNING id, business_name, venue_id, game_id,
                   offer_text, website_url, is_active`,
        values
      );

      console.log("Featured Partner updated ✅");
      console.table(result.rows);
    }
  }
} finally {
  await db.end();
}
