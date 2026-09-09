# Phase 3 journey routing

Phase 3 adds client-side navigation around the ten accepted journey boundaries.
It uses hash URLs and the browser History API, avoiding a new routing dependency
and remaining compatible with static hosting.

Examples include `#/home`, `#/choose-team`, `#/trip-hq`,
`#/plan-along-the-way`, and `#/game-day`. Browser back and forward navigation
updates the active screen while `App.jsx` stays mounted, so its existing state,
effects, authentication, persistence handlers, and API behavior remain intact.

Navigation availability reflects existing prerequisites:

- Choose Game becomes available after choosing a team.
- Trip HQ becomes available when an active saved or guest-preview trip exists.
- Plan screens become available after road-route geometry is ready.
- Game Weekend and Game Day become available from selected game or saved-trip
  venue context.
- Drive remains a disabled, reserved boundary.

Selecting a team advances to Choose Game. Successful guest or authenticated
football-trip creation advances to Trip HQ. Opening a saved trip also advances
to Trip HQ. These are navigation changes only; their underlying data and API
operations are unchanged.

The navigation styling is deliberately minimal. No substantive visual redesign,
advertising placement, backend/schema work, Journey Context, or Drive feature
work is included.
