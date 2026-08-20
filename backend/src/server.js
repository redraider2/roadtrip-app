require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const routeCache = new Map();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({
    ok: true,
    service: "roadtrip-api",
    health: "/health",
  });
});

function isValidRoutePoint(point) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function normalizeRoutePoint(point) {
  return {
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
  };
}

function parseGoogleDuration(duration) {
  return Number(duration?.replace("s", "")) || 0;
}

function decodeGooglePolyline(encoded) {
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([latitude / 1e5, longitude / 1e5]);
  }

  return points;
}

async function fetchOsrmRoute(points) {
  const coordinates = points
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

  const routeResponse = await fetch(url);

  if (!routeResponse.ok) {
    throw new Error("OSRM route request failed");
  }

  const data = await routeResponse.json();
  const route = data.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error("OSRM route not found");
  }

  return {
    provider: "osrm",
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry.coordinates.map(([longitude, latitude]) => [
      latitude,
      longitude,
    ]),
  };
}

async function fetchGoogleRoute(points) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const [origin, ...rest] = points;
  const destination = rest[rest.length - 1];
  const intermediates = rest.slice(0, -1).map((point) => ({
    location: {
      latLng: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
    },
  }));

  const routeResponse = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        intermediates,
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: "en-US",
        units: "IMPERIAL",
      }),
    }
  );

  if (!routeResponse.ok) {
    throw new Error("Google route request failed");
  }

  const data = await routeResponse.json();
  const route = data.routes?.[0];
  const encodedPolyline = route?.polyline?.encodedPolyline;

  if (!route || !encodedPolyline) {
    throw new Error("Google route not found");
  }

  return {
    provider: "google",
    distanceMeters: route.distanceMeters,
    durationSeconds: parseGoogleDuration(route.duration),
    geometry: decodeGooglePolyline(encodedPolyline),
  };
}

async function calculateRoute(points) {
  const provider = process.env.ROUTING_PROVIDER || "osrm";
  const cacheKey = `${provider}:${JSON.stringify(points)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  let route;

  if (provider === "google") {
    try {
      route = await fetchGoogleRoute(points);
    } catch (err) {
      console.error("Google route failed; falling back to OSRM:", err);
      route = await fetchOsrmRoute(points);
    }
  } else {
    route = await fetchOsrmRoute(points);
  }

  routeCache.set(cacheKey, route);
  return route;
}

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

app.post("/route", async (req, res) => {
  try {
    const { points } = req.body;

    if (
      !Array.isArray(points) ||
      points.length < 2 ||
      points.length > 25 ||
      !points.every(isValidRoutePoint)
    ) {
      return res.status(400).json({
        error:
          "points must include 2 to 25 valid latitude/longitude coordinate pairs",
      });
    }

    const route = await calculateRoute(points.map(normalizeRoutePoint));
    return res.json(route);
  } catch (err) {
    console.error("POST /route error:", err);
    return res.status(502).json({ error: "Failed to calculate route" });
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
         l.location_type,
         l.latitude,
         l.longitude,
         l.locality,
         l.admin_1,
         l.country_code,
         l.description,
         ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
         MAX(r.rating) FILTER (WHERE r.user_id = 1) AS user_rating
       FROM stops s
       JOIN locations l ON s.location_id = l.id
       LEFT JOIN reviews r ON r.location_id = l.id
       WHERE s.trip_id = $1
       GROUP BY s.id, l.id
       ORDER BY s.order_index ASC`,
      [tripId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /trips/:tripId/stops error:", err);
    return res.status(500).json({ error: "Failed to load stops" });
  }
});

app.delete("/trips/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM trips WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    return res.json({ deleted: result.rows[0].id });
  } catch (err) {
    console.error("DELETE /trips/:id error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/trips/:tripId/stops", async (req, res) => {
  const { tripId } = req.params;
  const { name, latitude, longitude, notes, location_type, trivia, rating } =
    req.body;

  if (!name || latitude == null || longitude == null) {
    return res
      .status(400)
      .json({ error: "name, latitude, and longitude are required" });
  }

  const normalizedRating =
    rating === "" || rating == null ? null : Number(rating);

  if (
    normalizedRating !== null &&
    (!Number.isInteger(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5)
  ) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }

  const client = await db.getClient();

  try {
    const stopType = location_type || "waypoint";
    const tempUserId = 1;

    await client.query("BEGIN");

    const locationResult = await client.query(
      `INSERT INTO locations
       (name, location_type, latitude, longitude, timezone, country_code, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        name,
        stopType,
        latitude,
        longitude,
        "America/Chicago",
        "US",
        trivia || null,
      ]
    );

    const locationId = locationResult.rows[0].id;

    if (normalizedRating !== null) {
      await client.query(
        `INSERT INTO reviews (user_id, location_id, rating)
         VALUES ($1, $2, $3)`,
        [tempUserId, locationId, normalizedRating]
      );
    }

    const orderResult = await client.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
       FROM stops
       WHERE trip_id = $1`,
      [tripId]
    );

    const nextOrder = orderResult.rows[0].next_order;

    const stopResult = await client.query(
      `INSERT INTO stops (trip_id, location_id, order_index, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tripId, locationId, nextOrder, notes || ""]
    );

    await client.query("COMMIT");

    return res.status(201).json(stopResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST /trips/:tripId/stops error:", err);
    return res.status(500).json({ error: "Failed to create stop" });
  } finally {
    client.release();
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
  const { id } = req.params;
  const { direction } = req.body;

  if (!["up", "down"].includes(direction)) {
    return res.status(400).json({ error: "direction must be up or down" });
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      "SELECT id, trip_id, order_index FROM stops WHERE id = $1",
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Stop not found" });
    }

    const current = currentResult.rows[0];
    const operator = direction === "up" ? "<" : ">";
    const sort = direction === "up" ? "DESC" : "ASC";

    const swapResult = await client.query(
      `SELECT id, order_index
       FROM stops
       WHERE trip_id = $1 AND order_index ${operator} $2
       ORDER BY order_index ${sort}
       LIMIT 1`,
      [current.trip_id, current.order_index]
    );

    if (swapResult.rows.length === 0) {
      await client.query("COMMIT");
      return res.json({ unchanged: true });
    }

    const swap = swapResult.rows[0];

    const tempOrderResult = await client.query(
      `SELECT COALESCE(MAX(order_index), 0) + 1 AS temp_order
       FROM stops
       WHERE trip_id = $1`,
      [current.trip_id]
    );
    const tempOrder = tempOrderResult.rows[0].temp_order;

    await client.query("UPDATE stops SET order_index = $1 WHERE id = $2", [
      tempOrder,
      current.id,
    ]);

    await client.query("UPDATE stops SET order_index = $1 WHERE id = $2", [
      current.order_index,
      swap.id,
    ]);

    await client.query("UPDATE stops SET order_index = $1 WHERE id = $2", [
      swap.order_index,
      current.id,
    ]);

    await client.query("COMMIT");

    return res.json({ reordered: true });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("PATCH /stops/:id/order error:", err);
    return res.status(500).json({ error: "Failed to reorder stop" });
  } finally {
    client.release();
  }
});

app.get("/football/games", async (req, res) => {
  try {
    const team = req.query.team || "Texas Tech";
    const year = Number(req.query.year) || new Date().getFullYear();
    const awayOnly = req.query.awayOnly === "true";
    if (!process.env.CFBD_API_KEY) {
      return res
        .status(500)
        .json({ error: "CFBD_API_KEY is not configured" });
    }

    const url = new URL("https://api.collegefootballdata.com/games");
    url.searchParams.set("year", year);
    url.searchParams.set("team", team);

    const cfbdResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
      },
    });

    if (!cfbdResponse.ok) {
      const errorText = await cfbdResponse.text();
      console.error("CFBD request failed:", cfbdResponse.status, errorText);

      return res.status(502).json({
        error: "Failed to load college football schedule",
      });
    }

    const games = await cfbdResponse.json();

    const simplifiedGames = games.map((game) => ({
      id: game.id,
      season: game.season,
      week: game.week,
      startDate: game.startDate,
      startTimeTBD: game.startTimeTBD,
      conferenceGame: game.conferenceGame,
      neutralSite: game.neutralSite,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      venue: game.venue,
      venueId: game.venueId,
      isAwayGame: game.awayTeam === team && !game.neutralSite,
    }));

    const filteredGames = awayOnly
      ? simplifiedGames.filter((game) => game.isAwayGame)
      : simplifiedGames;

    return res.json(filteredGames);
  } catch (err) {
    console.error("GET /football/games error:", err);

    return res.status(500).json({
      error: "Failed to load college football games",
    });
  }
});

app.get("/football/venues/:venueId", async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!process.env.CFBD_API_KEY) {
      return res
        .status(500)
        .json({ error: "CFBD_API_KEY is not configured" });
    }

    const cfbdResponse = await fetch(
      "https://api.collegefootballdata.com/venues",
      {
        headers: {
          Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
        },
      }
    );

    if (!cfbdResponse.ok) {
      const errorText = await cfbdResponse.text();
      console.error("CFBD venue request failed:", cfbdResponse.status, errorText);

      return res.status(502).json({
        error: "Failed to load college football venue",
      });
    }

    const venues = await cfbdResponse.json();

    const venue = venues.find(
      (item) => String(item.id) === String(venueId)
    );

    if (!venue) {
      return res.status(404).json({
        error: "Venue not found",
      });
    }

    return res.json({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      capacity: venue.capacity,
      latitude: venue.latitude ?? null,
      longitude: venue.longitude ?? null,
    });
  } catch (err) {
    console.error("GET /football/venues/:venueId error:", err);

    return res.status(500).json({
      error: "Failed to load college football venue",
    });
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
    });
  } catch (err) {
    console.error("GET /debug-db error:", err);
    return res.status(500).json({ error: "Debug route failed" });
  }
});

const port = Number(process.env.PORT) || 5001;

app.listen(port, () => {
  console.log(`RoadTrip API listening on http://localhost:${port}`);
});
