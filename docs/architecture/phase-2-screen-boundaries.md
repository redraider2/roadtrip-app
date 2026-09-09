# Phase 2 screen boundaries

Phase 2 introduces React ownership boundaries for the approved Kickoff Miles
journey without adding routes, changing state ownership, or changing the DOM.
`App.jsx` remains the orchestration owner for all state, effects, API calls,
authentication, and persistence.

The boundary components render fragments. This deliberately preserves the
existing element tree, CSS selectors, visual order, forms, event propagation,
and conditional rendering while creating seams for later screen extraction.

| Approved screen | Current Phase 2 ownership |
| --- | --- |
| Home | Existing brand header, authentication, and account summary |
| Choose Team | Existing team selector inside the road-trip form |
| Choose Game | Existing game selector, origin, drive preference, preview, and submit behavior |
| Trip HQ | Existing Trip Workspace, route map, trip summary, and persisted stop editing |
| Plan: Route & Schedule | Existing route overview and calculated trip statistics |
| Plan: Along the Way | Existing route recommendations and Save to Trip actions |
| Plan: Stay & Itinerary | Existing day-by-day travel plan |
| Drive | Reserved boundary only; no Drive UI or behavior is introduced |
| Game Weekend | Existing destination summary, map, partner, and nearby-place content |
| Game Day | Existing four-section Game Day Guide nested inside Game Weekend |

The boundary registry in `src/screens/journeyArchitecture.js` is intentionally
router-independent. Routing, URL state, Journey Context, and substantive visual
changes remain future-phase work.

Venue selection remains owned by the current application orchestration. The
selected game's `venueId` remains authoritative, preserving Northwestern's
game-level multi-venue handling.
