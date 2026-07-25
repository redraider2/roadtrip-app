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
