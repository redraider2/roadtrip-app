# RoadTrip

RoadTrip is a full-stack capstone project built for the Springboard curriculum. The app lets a user create road trips, preview routes on a map, and browse saved travel locations backed by a PostgreSQL database.

## Tech Stack

- Frontend: React, Vite, React Leaflet
- Backend: Node.js, Express
- Database: PostgreSQL
- Tooling: ESLint

## Project Structure

- `src/`: React frontend
- `backend/src/`: Express API and PostgreSQL connection
- `roadtrip_schema.sql`: database schema
- `roadtrip_seed.sql`: starter data for users, trips, and locations
- `Videos/`: background media used by the frontend

## Features

- Create trips with a title, start location, end location, and notes
- Preview trips and stops on an interactive map
- Calculate road-route distance and drive time through the backend
- Add stops with type, notes, trivia, and optional ratings
- Load saved trips, stops, and locations from the API
- Delete persisted trips
- Check backend and database health with `GET /health`

## Local Setup

1. Install frontend dependencies with `npm install`.
2. Install backend dependencies with `npm install --prefix backend`.
3. Create a `backend/.env` or project-root `.env` file with:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/roadtrip
PORT=5001
ROUTING_PROVIDER=osrm
GOOGLE_MAPS_API_KEY=
CORS_ORIGIN=http://localhost:5173
PGSSLMODE=
```

`ROUTING_PROVIDER` defaults to `osrm`. To use Google Routes API, set
`ROUTING_PROVIDER=google` and provide `GOOGLE_MAPS_API_KEY`. Google routing is
called from the backend so the API key is not exposed in the browser. If Google
routing fails, the backend falls back to OSRM.

4. Create the database schema:

```bash
psql "$DATABASE_URL" -f roadtrip_schema.sql
```

5. Seed sample data:

```bash
psql "$DATABASE_URL" -f roadtrip_seed.sql
```

6. Start the backend:

```bash
npm run --prefix backend dev
```

7. In a second terminal, start the frontend:

```bash
npm run dev
```

The frontend expects the API at `http://localhost:5001` unless
`VITE_API_URL` is set.

## Public Deployment

The GitHub Pages frontend is served from:

```text
https://redraider2.github.io/roadtrip-app/
```

GitHub Pages cannot run the Express API or PostgreSQL database. For the public
app to work for visitors, deploy the backend separately and build the frontend
with `VITE_API_URL` pointing to that backend.

Recommended setup:

1. Create a hosted PostgreSQL database, such as Neon.
2. Run `roadtrip_schema.sql` against the hosted database.
3. Optionally export local data with `pg_dump` and restore it into the hosted
   database.
4. Create a Render web service from this repository. `render.yaml` configures
   the backend service from the `backend/` directory.
5. Set these Render environment variables:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
ROUTING_PROVIDER=google
GOOGLE_MAPS_API_KEY=...
CORS_ORIGIN=https://redraider2.github.io
PGSSLMODE=require
```

6. After Render gives you a public API URL, rebuild and deploy the frontend:

```bash
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com npm run deploy
```

## Notes

- The current trip model stores route endpoints as text locations because the frontend map geocodes place names for preview.
- The provided seed data includes one demo user so trip creation works immediately against a fresh schema.

### Bowl games, neutral sites, and the College Football Playoff

The game picker requests `/football/games?team=Texas&year=2026&roadOnly=true&includePostseason=true`.
The backend requests both regular-season and postseason games from CFBD, using the football season year
so January 2027 bowls remain part of the 2026 schedule. Legacy `awayOnly=true` requests retain their
previous meaning; `roadOnly=true` includes regular away games, either neutral-site team designation,
and postseason games (including campus playoff games).

The picker has a dedicated **College Football Playoff** section, followed by **Bowl & Road Games**.
CFP classification uses provider playoff metadata or an explicit CFP/College Football Playoff event
label, never the stadium name alone. Round labels and bowl names use provider data. Unannounced
matchups are not invented, and games without a venue ID cannot start a trip.

Trips use the actual event venue for routing, nearby places, destination partners, and guides.
New bowl cities can use nearby-place discovery without curated city inventory. Editorial picks,
partner placements, photos, and guides still require coverage for that exact venue; missing coverage
does not fall back to either team's home city. Neutral-site matchups display “vs,” and the event name
is retained in saved trip notes. Venue guides should be checked against event-specific rules.

Release the backend before the frontend because the picker relies on the new schedule query options.
Validate locally with `npm run build`, `node --test tests/footballSchedule.test.mjs tests/postseasonSchedule.test.mjs tests/footballScheduleApi.test.mjs`,
and `JOURNEY_BASE_URL=http://127.0.0.1:4173 node tests/browser/postseasonPlanner.test.mjs` against `npm run preview`.
Browser fixtures use synthetic events and venues rather than unannounced real matchups.
