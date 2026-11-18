# HeyCatch journey events

Status: local implementation prepared for review; do not push, merge, or deploy until the owner approves. A branch push can trigger Vercel preview deployment, so the initial review remains local.

## Existing SDK

The app already initializes `@heycatch/sdk` once in `src/main.jsx`. It has not been reinstalled, upgraded, or reconfigured. The installed SDK is 0.8.5. Its browser type declarations and the official guide at https://heycatch.ai/agents.md confirm:

```js
import { analytics } from "@heycatch/sdk";
analytics.trackEvent("event_name", { property: "value" });
```

The new controller uses that existing SDK instance. SDK failures do not interrupt application actions.

## Outcomes and properties

| Event | Successful outcome | Custom properties |
| --- | --- | --- |
| `team_selected` | A valid team from the loaded list becomes selected | `team_id` (when available), `team_name`, `season` |
| `away_game_selected` | A valid upcoming away game becomes selected | `game_id`, `away_team`, `home_team`, `venue_id`, `season` |
| `route_created` | The first valid route for a newly requested trip finishes | `trip_type`, `planning_mode` (`preview`/`saved`), rounded `distance_miles`, rounded `drive_minutes`, `route_stop_count` |
| `trip_saved` | An authenticated POST succeeds and returns a positive persisted trip ID | `trip_type`, `venue_id` (football trips), `persistence: "server"` |

`trip_saved` can precede `route_created`: the existing application saves the trip record before calculating the route. A saved trip whose route fails still produces `trip_saved`, but does not produce `route_created`.

No custom properties contain account IDs, emails, names of people, auth tokens, user-entered trip names/notes/addresses, starting locations, coordinates, or route geometry. Public team and venue metadata are distinct from private trip data. Existing SDK automatic metadata/collection settings are unchanged.

Repeated selection of the same current team/game is ignored. Rapid repeated trip submissions share an in-flight guard. Repeated route effects, recalculations, restoring saved state, and reopening after refresh do not create new journey outcome events. A new trip request starts a new route outcome; stop edits do not report another initial route.

The expired-session fallback now preserves the guest preview when the auth-change effect refreshes trip state. Preview creation never reports persistence.

## Verification

```sh
node --test tests/journeyAnalytics.test.mjs
npm run test:analytics:browser
npm run build
npm test
```

The browser test requires backend dependencies (`npm ci --prefix backend`) and PostgreSQL binaries (`pg_config --bindir`, or `PG_BIN=/path/to/postgresql/bin`). It creates a disposable PostgreSQL cluster and runs the existing Express server against that database. It tests real registration/login and real trip INSERT/SELECT; football, mapping, and recommendation services use deterministic fixtures. It does not access a production database.

The local test server adds a test-only SDK `beforeSend` sink. It observes the real installed SDK and drops all test telemetry before delivery. The production initialization is unchanged. Screenshots are written under `outputs/analytics-verification/`.

Coverage includes event timing before/after save, repeated submissions/selections, guest previews, save errors, route errors, expired sessions, and opening a persisted trip after a browser refresh without duplicate outcome events.

Before production approval, review the local diff and test results. After approval, push the reviewed branch, create/merge a PR after required checks, and verify actual HeyCatch ingestion with a controlled production journey. Dashboard receipt cannot be confirmed before deploying this change.

## Verified local results (2026-11-18)

- Production build passes; bundle inspected for absence of test hooks.
- Four focused analytics unit tests pass.
- All six browser scenarios pass with the real installed HeyCatch SDK, the existing Express backend, and an isolated PostgreSQL database. The test models a normal browser because the SDK intentionally filters headless/automation user agents; every event is still dropped locally by `beforeSend`.
- Full unit suite: 152 tests, 146 pass, 6 fail. An unchanged main checkout has 148 tests, 142 pass, and the same 6 failures: two Game Day inventory/workbook checks (the default tracker workbook is absent), plus four stale source assertions for homepage/partner/demo/Trip HQ markup. This change introduces no additional failures.
- The existing Choose Game source assertion was updated for its instrumented handler; behavioral selection/submit/back coverage remains.
- New analytics module lint and `git diff --check` pass.
- No production telemetry or production database writes were used for verification. No branch push or deployment was performed.
