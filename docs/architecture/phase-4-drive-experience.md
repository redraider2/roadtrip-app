# Phase 4 Drive experience

Phase 4 activates the previously reserved Drive boundary. The screen is
available once an active trip has road-route geometry, using the same
`hasRoute` prerequisite as the PLAN workspace. No live vehicle location,
turn-by-turn navigation, or background tracking is introduced.

## Screen ownership

`DriveExperience` owns the Drive presentation while `App.jsx` continues to own
trip state, route geometry, selected-game context, recommendations, saved stops,
featured-partner data, and journey navigation.

The screen presents:

- the trip and selected-game identity;
- total route distance, drive time, and planned travel-day count;
- the existing route geometry in `TripMap`;
- the first planned travel day's food, historic, and overnight stops;
- additional saved road-trip stops with external directions and website links;
- an optional, data-driven partner placement; and
- a handoff to Game Weekend after arrival.

## Routing and prerequisites

Trip HQ enables Drive when `hasRoute` is true. The Drive route is `#/drive` and
renders only when an active trip and route geometry are available. Its back
action returns to Trip HQ, and its arrival action advances to Game Weekend.

Direct links remain subject to the existing application prerequisites: a Drive
hash without an active routed trip does not fabricate trip or route state.

## Explicit boundaries

Drive is a trip-planning companion, not a navigation product. It does not
provide live GPS position, rerouting, traffic guidance, turn-by-turn directions,
arrival detection, or safety-critical driving instructions. Directions links
open the external map provider selected by the existing implementation.
