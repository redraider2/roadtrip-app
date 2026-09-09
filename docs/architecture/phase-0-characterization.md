# Phase 0 characterization baseline

This baseline supports the approved `PLAN → DRIVE → GAME WEEKEND` refactor. It
describes the application as it exists before routing, shared journey context,
component extraction, schema changes, or UX redesign.

## Safety net

- Pure route, date, overnight, travel-day, recommendation-ordering, hotel, and
  place-normalization behavior is covered by Node unit tests.
- Source-level contract tests assert that the current public football/route APIs
  and authenticated trip/stop APIs remain registered with their existing paths.
- Source-level flow tests characterize guest preview trips and guest stops, plus
  authenticated Bearer-token trip and stop persistence.
- The Game Day Guide response is characterized as four sections: tailgating,
  parking and arrival, know before you go, and traditions.

These are characterization tests, not live service integration tests. They do
not contact CFBD, Google Places, a routing provider, or PostgreSQL. A later phase
should add browser-level tests once screen boundaries and routing are approved.

## Current contract inventory

Public planning and game APIs include `POST /route`,
`POST /football/along-the-way`, `GET /football/teams`,
`GET /football/games`, and the venue, nearby-places, featured-partner,
tailgating, and Game Day Guide venue endpoints.

Authenticated persistence includes trip list/create/delete/favorite operations,
trip-stop list/create, and stop delete/route-toggle/order operations. These use
the current `requireAuth` middleware and Bearer token supplied by the frontend.

## Documented schema drift (no schema changes made)

The checked-in `roadtrip_schema.sql` does not fully describe the schema consumed
by `backend/src/server.js`:

1. `stops.is_route_stop` is selected, inserted, updated, and filtered by the
   server, but is absent from the checked-in `stops` table definition.
2. The server's Game Day Guide query expects `parking_arrival`, `parking_url`,
   `know_before_you_go`, `policies_url`, `traditions`, and `traditions_url` on
   `tailgating_guides`; those columns are absent from the checked-in definition.
3. The server queries `featured_partners`, while the checked-in schema does not
   define that table. A separate creation script exists under `backend/`.
4. `roadtrip_schema.sql` begins with destructive `DROP TABLE` statements and is
   a reset/bootstrap script, not a safe production migration.

Before any schema work, production structure should be introspected read-only and
converted into explicit forward-only migrations. That work is intentionally out
of scope for Phase 0 and Phase 1.

## Northwestern venue exception

Northwestern remains a 2026 game-level venue exception. The frontend derives the
active venue ID from `selectedFootballGame.venueId` before falling back to a
saved trip venue ID. No school-level Northwestern venue ID is introduced here.
