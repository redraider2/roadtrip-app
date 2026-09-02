require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();
const routeCache = new Map();

app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again shortly.",
  },
});

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN must be configured in production");
}

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ["http://localhost:5173"];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS rejected origin:", origin);
      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  return res.json({
    ok: true,
    service: "roadtrip-api",
    health: "/health",
  });
});

app.use(apiLimiter);

function createAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      error: "Authentication is not configured",
    });
  }

  const authorization = req.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Invalid user id");
    }

    req.user = {
      id: userId,
      username: payload.username,
      email: payload.email,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired authentication token",
    });
  }
}

app.post("/auth/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || password.length < 8) {
      return res.status(400).json({
        error: "Username, email, and a password of at least 8 characters are required",
      });
    }

    const existing = await db.query(
      `SELECT id
       FROM users
       WHERE username = $1 OR email = $2
       LIMIT 1`,
      [username, email]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        error: "Username or email is already in use",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at AS "createdAt"`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = createAuthToken(user);

    return res.status(201).json({
      token,
      user,
    });
  } catch (err) {
    console.error("POST /auth/register error:", err);
    return res.status(500).json({
      error: "Failed to create account",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const result = await db.query(
      `SELECT id, username, email, password_hash
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = createAuthToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("POST /auth/login error:", err);
    return res.status(500).json({
      error: "Failed to sign in",
    });
  }
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

app.get("/geocode", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "q is required",
      });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        error: "GOOGLE_MAPS_API_KEY is not configured",
      });
    }

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 1,
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();

      console.error(
        "Google geocode request failed:",
        googleResponse.status,
        errorText
      );

      return res.status(502).json({
        error: "Failed to geocode location",
      });
    }

    const data = await googleResponse.json();
    const place = data.places?.[0];

    if (
      !place?.location ||
      !Number.isFinite(place.location.latitude) ||
      !Number.isFinite(place.location.longitude)
    ) {
      return res.status(404).json({
        error: `No location found for ${query}`,
      });
    }

    return res.json({
      name: place.displayName?.text || query,
      formattedAddress: place.formattedAddress || query,
      latitude: place.location.latitude,
      longitude: place.location.longitude,
    });
  } catch (err) {
    console.error("GET /geocode error:", err);

    return res.status(500).json({
      error: "Failed to geocode location",
    });
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
      [id, req.user.id]
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

app.get("/trips", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         user_id,
         title,
         start_location,
         end_location,
         venue_id,
         start_at_utc,
         end_at_utc,
         notes,
         is_favorite,
         created_at AS "createdAt"
       FROM trips
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /trips error:", err);
    return res.status(500).json({ error: "Failed to load trips" });
  }
});

app.post("/trips", requireAuth, async (req, res) => {
  try {
    const { title, start_location, end_location, notes, venue_id } = req.body;

    if (!start_location || !end_location) {
      return res
        .status(400)
        .json({ error: "start_location and end_location are required" });
    }

    const userId = req.user.id;

    const result = await db.query(
      `INSERT INTO trips (user_id, title, start_location, end_location, notes, venue_id)
 VALUES ($1, $2, $3, $4, $5, $6)
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
        userId,
        title || `${start_location} → ${end_location}`,
        start_location,
        end_location,
        notes || "",
        venue_id || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /trips error:", err);
    return res.status(500).json({ error: "Failed to create trip" });
  }
});

app.patch("/trips/:id/favorite", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE trips
       SET is_favorite = NOT is_favorite
       WHERE id = $1 AND user_id = $2
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
      [id, req.user.id]
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

app.get("/trips/:tripId/stops", requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;

    const tripResult = await db.query(
      "SELECT id FROM trips WHERE id = $1 AND user_id = $2",
      [tripId, req.user.id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const result = await db.query(
      `SELECT
         s.id,
         s.trip_id,
         s.location_id,
         s.order_index,
         s.notes,
         s.is_route_stop,
         l.name,
         l.location_type,
         l.latitude,
         l.longitude,
         l.locality,
         l.admin_1,
         l.country_code,
         l.description,
         ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
         MAX(r.rating) FILTER (WHERE r.user_id = $2) AS user_rating
       FROM stops s
       JOIN trips t ON s.trip_id = t.id
       JOIN locations l ON s.location_id = l.id
       LEFT JOIN reviews r ON r.location_id = l.id
       WHERE s.trip_id = $1 AND t.user_id = $2
       GROUP BY s.id, l.id
       ORDER BY s.order_index ASC`,
      [tripId, req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET /trips/:tripId/stops error:", err);
    return res.status(500).json({ error: "Failed to load stops" });
  }
});

app.delete("/trips/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM trips WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
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

app.post("/trips/:tripId/stops", requireAuth, async (req, res) => {
  const { tripId } = req.params;
  const {
    name,
    latitude,
    longitude,
    notes,
    location_type,
    trivia,
    rating,
    is_route_stop,
  } = req.body;

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
    const userId = req.user.id;

    await client.query("BEGIN");

    const tripResult = await client.query(
      "SELECT id FROM trips WHERE id = $1 AND user_id = $2",
      [tripId, userId]
    );

    if (tripResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Trip not found" });
    }

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
        [userId, locationId, normalizedRating]
      );
    }

    const orderResult = await client.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
       FROM stops
       WHERE trip_id = $1`,
      [tripId]
    );

    const nextOrder = orderResult.rows[0].next_order;

    const routeStop =
      is_route_stop === false || is_route_stop === "false" ? false : true;

    const stopResult = await client.query(
      `INSERT INTO stops
       (trip_id, location_id, order_index, notes, is_route_stop)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tripId, locationId, nextOrder, notes || "", routeStop]
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

app.delete("/stops/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM stops
       USING trips
       WHERE stops.id = $1
         AND stops.trip_id = trips.id
         AND trips.user_id = $2
       RETURNING stops.id`,
      [id, req.user.id]
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

app.patch("/stops/:id/route", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_route_stop } = req.body;

    if (typeof is_route_stop !== "boolean") {
      return res.status(400).json({
        error: "is_route_stop must be true or false",
      });
    }

    const result = await db.query(
      `UPDATE stops
       SET is_route_stop = $1
       FROM trips
       WHERE stops.id = $2
         AND stops.trip_id = trips.id
         AND trips.user_id = $3
       RETURNING stops.*`,
      [is_route_stop, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /stops/:id/route error:", err);
    return res.status(500).json({
      error: "Failed to update route status",
    });
  }
});

app.patch("/stops/:id/order", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { direction } = req.body;

  if (!["up", "down"].includes(direction)) {
    return res.status(400).json({ error: "direction must be up or down" });
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT s.id, s.trip_id, s.order_index
       FROM stops s
       JOIN trips t ON s.trip_id = t.id
       WHERE s.id = $1
         AND t.user_id = $2
         AND s.is_route_stop = TRUE`,
      [id, req.user.id]
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
       WHERE trip_id = $1
         AND is_route_stop = TRUE
         AND order_index ${operator} $2
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

function haversineMeters(a, b) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);

  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    earthRadius *
    Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
  );
}

function sampleRouteGeometry(geometry, sampleCount = 5) {
  const points = geometry
    .map(([latitude, longitude]) => ({
      latitude: Number(latitude),
      longitude: Number(longitude),
    }))
    .filter(isValidRoutePoint);

  if (points.length < 2) {
    return [];
  }

  const cumulativeDistances = [0];

  for (let i = 1; i < points.length; i += 1) {
    cumulativeDistances.push(
      cumulativeDistances[i - 1] +
        haversineMeters(points[i - 1], points[i])
    );
  }

  const totalDistance =
    cumulativeDistances[cumulativeDistances.length - 1];

  if (!totalDistance) {
    return [];
  }

  const samples = [];

  for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
    const targetDistance =
      (totalDistance * sampleIndex) / (sampleCount + 1);

    let pointIndex = cumulativeDistances.findIndex(
      (distance) => distance >= targetDistance
    );

    if (pointIndex === -1) {
      pointIndex = points.length - 1;
    }

    samples.push({
      ...points[pointIndex],
      routeProgress: targetDistance / totalDistance,
    });
  }

  return samples;
}

app.post("/football/along-the-way", async (req, res) => {
  try {
    const { geometry, category = "restaurant" } = req.body;

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res
        .status(500)
        .json({ error: "GOOGLE_MAPS_API_KEY is not configured" });
    }

    if (!Array.isArray(geometry) || geometry.length < 2) {
      return res.status(400).json({
        error: "geometry must contain at least two route points",
      });
    }

    const allowedCategories = {
      restaurant: ["restaurant"],
      hotel: ["hotel"],
      attraction: ["tourist_attraction"],
      historic: ["historical_landmark"],
      museum: ["museum"],
    };

    const includedTypes = allowedCategories[category];

    if (!includedTypes) {
      return res.status(400).json({
        error:
          "category must be restaurant, hotel, attraction, historic, or museum",
      });
    }

    const routeSamples = sampleRouteGeometry(geometry, 7);

    if (!routeSamples.length) {
      return res.status(400).json({
        error: "Could not sample the supplied route",
      });
    }

    const searches = routeSamples.map(async (sample) => {
      const placesResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchNearby",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.primaryType",
          },
          body: JSON.stringify({
            includedPrimaryTypes: includedTypes,
            maxResultCount: 5,
            rankPreference: "POPULARITY",
            locationRestriction: {
              circle: {
                center: {
                  latitude: sample.latitude,
                  longitude: sample.longitude,
                },
                radius: 25000,
              },
            },
          }),
        }
      );

      if (!placesResponse.ok) {
        const errorText = await placesResponse.text();

        console.error(
          "Along-the-way Places request failed:",
          placesResponse.status,
          errorText
        );

        return [];
      }

      const data = await placesResponse.json();

      return (data.places || []).map((place) => ({
        id: place.id,
        name: place.displayName?.text || "Unknown",
        address: place.formattedAddress || "",
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        ratingCount: place.userRatingCount ?? null,
        website: place.websiteUri || null,
        primaryType: place.primaryType || null,
        routeProgress: sample.routeProgress,
      }));
    });

    const results = (await Promise.all(searches)).flat();

    const uniquePlaces = Array.from(
      new Map(results.map((place) => [place.id, place])).values()
    );

    const rankedPlaces = uniquePlaces
      .sort((a, b) => {
        const ratingDifference = (b.rating || 0) - (a.rating || 0);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return (b.ratingCount || 0) - (a.ratingCount || 0);
      })
      .slice(0, 15);

    return res.json({
      category,
      sampledPoints: routeSamples.length,
      places: rankedPlaces,
    });
  } catch (err) {
    console.error("POST /football/along-the-way error:", err);

    return res.status(500).json({
      error: "Failed to load places along the route",
    });
  }
});

async function fetchWithRetry(url, options = {}, retries = 1) {
  let lastResponse;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      lastResponse = response;

      if (![502, 503, 504].includes(response.status)) {
        return response;
      }

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (attempt + 1))
      );
    }
  }

  return lastResponse;
}

app.get("/football/teams", async (req, res) => {
  try {
    if (!process.env.CFBD_API_KEY) {
      return res
        .status(500)
        .json({ error: "CFBD_API_KEY is not configured" });
    }

    const cfbdResponse = await fetchWithRetry(
      "https://api.collegefootballdata.com/teams/fbs",
      {
        headers: {
          Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
        },
      }
    );

    if (!cfbdResponse.ok) {
      const errorText = await cfbdResponse.text();
      console.error("CFBD teams request failed:", cfbdResponse.status, errorText);

      return res.status(502).json({
        error: "Failed to load college football teams",
      });
    }

    const teams = await cfbdResponse.json();

    const simplifiedTeams = teams
      .map((team) => ({
        id: team.id,
        school: team.school,
        mascot: team.mascot,
        abbreviation: team.abbreviation,
        conference: team.conference,
        color: team.color,
        alternateColor: team.alt_color,
        logos: team.logos || [],
      }))
      .sort((a, b) => a.school.localeCompare(b.school));

    return res.json(simplifiedTeams);
  } catch (err) {
    console.error("GET /football/teams error:", err);

    return res.status(500).json({
      error: "Failed to load college football teams",
    });
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

    const cfbdResponse = await fetchWithRetry(url,{
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

app.get("/football/venues/:venueId/tailgating", async (req, res) => {
  try {
    const { venueId } = req.params;

    const result = await db.query(
      `SELECT
         school,
         venue_id,
         venue_name,
         where_to_tailgate,
         when_to_arrive,
         rules,
         visiting_fans,
         official_url,
         last_verified
       FROM tailgating_guides
       WHERE venue_id = $1
       LIMIT 1`,
      [venueId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Tailgating guide not found",
      });
    }

    const guide = result.rows[0];

    return res.json({
      school: guide.school,
      venueId: guide.venue_id,
      venueName: guide.venue_name,
      where: guide.where_to_tailgate,
      arrival: guide.when_to_arrive,
      rules: guide.rules,
      visitors: guide.visiting_fans,
      sourceUrl: guide.official_url,
      lastVerified: guide.last_verified,
    });
  } catch (err) {
    console.error("GET /football/venues/:venueId/tailgating error:", err);

    return res.status(500).json({
      error: "Failed to load tailgating guide",
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

app.get("/football/venues/:venueId/places", async (req, res) => {
  try {
    const { venueId } = req.params;
    const category = req.query.category || "restaurant";

    if (!process.env.CFBD_API_KEY) {
      return res
        .status(500)
        .json({ error: "CFBD_API_KEY is not configured" });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res
        .status(500)
        .json({ error: "GOOGLE_MAPS_API_KEY is not configured" });
    }

    const venueResponse = await fetch(
      "https://api.collegefootballdata.com/venues",
      {
        headers: {
          Authorization: `Bearer ${process.env.CFBD_API_KEY}`,
        },
      }
    );

    if (!venueResponse.ok) {
      return res.status(502).json({
        error: "Failed to load venue details",
      });
    }

    const venues = await venueResponse.json();

    const venue = venues.find(
      (item) => String(item.id) === String(venueId)
    );

    if (!venue) {
      return res.status(404).json({
        error: "Venue not found",
      });
    }

    const allowedCategories = {
      restaurant: ["restaurant"],
      bar: ["bar"],
      cafe: ["cafe"],
      hotel: ["hotel"],
    };

    const includedTypes =
      allowedCategories[category] || allowedCategories.restaurant;

    const placesResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.primaryType",
        },
        body: JSON.stringify({
          includedPrimaryTypes: includedTypes,
          maxResultCount: 10,
          rankPreference: "POPULARITY",
          locationRestriction: {
            circle: {
              center: {
                latitude: venue.latitude,
                longitude: venue.longitude,
              },
              radius: 5000,
            },
          },
        }),
      }
    );

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text();
      console.error(
        "Google Places request failed:",
        placesResponse.status,
        errorText
      );

      return res.status(502).json({
        error: "Failed to load nearby places",
      });
    }

    const data = await placesResponse.json();

    const places = (data.places || []).map((place) => ({
      id: place.id,
      name: place.displayName?.text || "Unknown",
      address: place.formattedAddress || "",
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      website: place.websiteUri || null,
      primaryType: place.primaryType || null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
    }));

    return res.json({
      venue: {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        latitude: venue.latitude ?? null,
        longitude: venue.longitude ?? null,
      },
      category,
      places,
    });
  } catch (err) {
    console.error("GET /football/venues/:venueId/places error:", err);

    return res.status(500).json({
      error: "Failed to load nearby places",
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
