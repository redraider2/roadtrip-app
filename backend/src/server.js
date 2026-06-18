require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS now;");
    return res.json({
      ok: true,
      service: "roadtrip-api",
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    console.error("DB connection error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Database connection failed" });
  }
});

app.get("/locations", async (req, res) => {
  try {
    const { country } = req.query;
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;

    let query = "SELECT * FROM locations";
    const values = [];
    const conditions = [];

    if (country) {
      values.push(country);
      conditions.push(`country_code = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    values.push(limit);
    values.push(offset);

    query += ` ORDER BY id LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const result = await db.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET /locations error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query("SELECT * FROM locations WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /locations/:id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/locations", async (req, res) => {
  try {
    const {
      name,
      location_type,
      latitude,
      longitude,
      timezone,
      country_code,
      admin_1,
      admin_2,
      locality,
      postal_code,
      address_line1,
      address_line2,
      description,
    } = req.body;

    if (!name || latitude == null || longitude == null || !country_code) {
      return res.status(400).json({
        error: "name, latitude, longitude, and country_code are required",
      });
    }

    const result = await db.query(
      `INSERT INTO locations
       (name, location_type, latitude, longitude, timezone,
        country_code, admin_1, admin_2, locality, postal_code,
        address_line1, address_line2, description)
       VALUES
       ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *;`,
      [
        name,
        location_type ?? null,
        latitude,
        longitude,
        timezone ?? null,
        country_code,
        admin_1 ?? null,
        admin_2 ?? null,
        locality ?? null,
        postal_code ?? null,
        address_line1 ?? null,
        address_line2 ?? null,
        description ?? null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /locations error:", err);
    return res.status(500).json({ error: "Failed to create location" });
  }
});

app.put("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      location_type,
      latitude,
      longitude,
      timezone,
      country_code,
      admin_1,
      admin_2,
      locality,
      postal_code,
      address_line1,
      address_line2,
      description,
    } = req.body;

    if (!name || latitude == null || longitude == null || !country_code) {
      return res.status(400).json({
        error: "name, latitude, longitude, and country_code are required",
      });
    }

    const result = await db.query(
      `
      UPDATE locations
      SET
        name = $1,
        location_type = $2,
        latitude = $3,
        longitude = $4,
        timezone = $5,
        country_code = $6,
        admin_1 = $7,
        admin_2 = $8,
        locality = $9,
        postal_code = $10,
        address_line1 = $11,
        address_line2 = $12,
        description = $13
      WHERE id = $14
      RETURNING *;
      `,
      [
        name,
        location_type ?? null,
        latitude,
        longitude,
        timezone ?? null,
        country_code,
        admin_1 ?? null,
        admin_2 ?? null,
        locality ?? null,
        postal_code ?? null,
        address_line1 ?? null,
        address_line2 ?? null,
        description ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /locations/:id error:", err);
    return res.status(500).json({ error: "Failed to update location" });
  }
});

app.delete("/locations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM locations WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.json({ deleted: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /locations/:id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/trips", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         user_id,
         title,
         start_location,
         end_location,
         start_at_utc,
         end_at_utc,
         notes,
         is_favorite,
         created_at AS "createdAt"
       FROM trips
       ORDER BY created_at DESC`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /trips error:", err);
    return res.status(500).json({ error: "Failed to load trips" });
  }
});

app.post("/trips", async (req, res) => {
  try {
    const { title, start_location, end_location, notes } = req.body;

    if (!start_location || !end_location) {
      return res
        .status(400)
        .json({ error: "start_location and end_location are required" });
    }

    const tempUserId = 1;

    const result = await db.query(
      `INSERT INTO trips (user_id, title, start_location, end_location, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         user_id,
         title,
         start_location,
         end_location,
         start_at_utc,
         end_at_utc,
         notes,
         created_at AS "createdAt"`,
      [
        tempUserId,
        title || `${start_location} → ${end_location}`,
        start_location,
        end_location,
        notes || "",
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /trips error:", err);
    return res.status(500).json({ error: "Failed to create trip" });
  }
});

app.patch("/trips/:id/favorite", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE trips
       SET is_favorite = NOT is_favorite
       WHERE id = $1
       RETURNING
         id,
         user_id,
         title,
         start_location,
         end_location,
         start_at_utc,
         end_at_utc,
         notes,
         is_favorite,
         created_at AS "createdAt"`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /trips/:id/favorite error:", err);
    return res.status(500).json({ error: "Failed to update favorite" });
  }
});

app.get("/trips/:tripId/stops", async (req, res) => {
  try {
    const { tripId } = req.params;

    const result = await db.query(
      `SELECT
         s.id,
         s.trip_id,
         s.location_id,
         s.order_index,
         s.notes,
         l.name,
         l.latitude,
         l.longitude,
         l.locality,
         l.admin_1,
         l.country_code
       FROM stops s
       JOIN locations l ON s.location_id = l.id
       WHERE s.trip_id = $1
       ORDER BY s.order_index ASC`,
      [tripId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /trips/:tripId/stops error:", err);
    return res.status(500).json({ error: "Failed to load stops" });
  }
});

app.post("/trips/:tripId/stops", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { name, latitude, longitude, notes } = req.body;

    if (!name || latitude == null || longitude == null) {
      return res
        .status(400)
        .json({ error: "name, latitude, and longitude are required" });
    }

    const locationResult = await db.query(
      `INSERT INTO locations
       (name, location_type, latitude, longitude, timezone, country_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, "waypoint", latitude, longitude, "America/Chicago", "US"]
    );

    const locationId = locationResult.rows[0].id;

    const orderResult = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
       FROM stops
       WHERE trip_id = $1`,
      [tripId]
    );

    const nextOrder = orderResult.rows[0].next_order;

    const stopResult = await db.query(
      `INSERT INTO stops (trip_id, location_id, order_index, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tripId, locationId, nextOrder, notes || ""]
    );

    return res.status(201).json(stopResult.rows[0]);
  } catch (err) {
    console.error("POST /trips/:tripId/stops error:", err);
    return res.status(500).json({ error: "Failed to create stop" });
  }
});

app.delete("/stops/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM stops
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    return res.json({ deleted: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /stops/:id error:", err);
    return res.status(500).json({ error: "Failed to delete stop" });
  }
});

app.patch("/stops/:id/order", async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({ error: "direction must be up or down" });
    }

    const currentResult = await db.query(
      "SELECT id, trip_id, order_index FROM stops WHERE id = $1",
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    const current = currentResult.rows[0];
    const operator = direction === "up" ? "<" : ">";
    const sort = direction === "up" ? "DESC" : "ASC";

    const swapResult = await db.query(
      `SELECT id, order_index
       FROM stops
       WHERE trip_id = $1 AND order_index ${operator} $2
       ORDER BY order_index ${sort}
       LIMIT 1`,
      [current.trip_id, current.order_index]
    );

    if (swapResult.rows.length === 0) {
      return res.json({ unchanged: true });
    }

    const swap = swapResult.rows[0];

    await db.query("BEGIN");

    await db.query("UPDATE stops SET order_index = $1 WHERE id = $2", [
      swap.order_index,
      current.id,
    ]);

    await db.query("UPDATE stops SET order_index = $1 WHERE id = $2", [
      current.order_index,
      swap.id,
    ]);

    await db.query("COMMIT");

    return res.json({ reordered: true });
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("PATCH /stops/:id/order error:", err);
    return res.status(500).json({ error: "Failed to reorder stop" });
  }
});

app.get("/debug-db", async (req, res) => {
  try {
    const dbName = await db.query("SELECT current_database() AS db;");
    const tripCols = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'trips'
      ORDER BY ordinal_position
    `);

    return res.json({
      database: dbName.rows[0].db,
      tripColumns: tripCols.rows.map((r) => r.column_name),
      databaseUrl: process.env.DATABASE_URL || null,
    });
  } catch (err) {
    console.error("GET /debug-db error:", err);
    return res.status(500).json({ error: "Debug route failed" });
  }
});

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`RoadTrip API listening on http://localhost:${port}`);
});