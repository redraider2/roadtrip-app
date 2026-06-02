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
- Preview trip endpoints on an interactive map
- Load saved locations from the API
- Delete persisted trips
- Check backend and database health with `GET /health`

## Local Setup

1. Install frontend dependencies with `npm install`.
2. Install backend dependencies with `npm install --prefix backend`.
3. Create a `backend/.env` or project-root `.env` file with:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/roadtrip
PORT=5001
```

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

The frontend expects the API at `http://localhost:5001`.

## Notes

- The current trip model stores route endpoints as text locations because the frontend map geocodes place names for preview.
- The provided seed data includes one demo user so trip creation works immediately against a fresh schema.
