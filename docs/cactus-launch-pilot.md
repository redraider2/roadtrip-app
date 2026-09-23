# Cactus Theater launch pilot

Cactus is a complimentary 2026 Lubbock launch partner. Commercial terms are not rendered by this implementation.

## Implementation

- `src/lib/destinationPartners.js` is the consumer destination-partner registry. Texas Tech's destination venue ID (`3784`) controls eligibility; traveling Texas Tech fans at another venue do not qualify. Each partner declares its allowed placements, creative and actions. No Game Day placement exists.
- `src/components/DestinationPartnerDiscovery.jsx` renders the shared small/featured card and destination section. The three calls in `src/App.jsx` follow the trip workspace, itinerary timeline, and Game Weekend destination/map content respectively.
- Save uses the existing geocoder and `addSuggestedStop` flow, including the existing guest stops and authenticated `/trips/:id/stops` API. Pending/saved buttons prevent duplicate submissions; failures remain retryable. No second itinerary store was introduced.
- Tracking uses the existing `kickoff_miles_partner_events` local-storage event buffer. Pilot events add `partner_id`, `market`, `placement`, `creative`, and `action`; existing event fields remain supported. Impressions require 25% visibility and occur once per card mount. This is the existing local tracking hook, not a new remote analytics integration.
- Event URL: https://cactustheater.com/events/ (verified against the official events page).
- Image: `public/partners/cactus-theater.jpg`, extracted unchanged from image object 92 in the supplied `Advertising Markets/Lubbock/Cactus Theater/Cactus_Theater_Kickoff_Miles_FINAL_v2.pdf`. This is the approved front/marquee photograph, not a sales graphic. The embedded photo is somewhat soft at featured size; no required asset or URL is missing.

## Review and verification

Run `npm run dev`, then `npm run test:partners:browser` in another terminal. Browser tests use Chrome by default; set `PLAYWRIGHT_CHANNEL` for another installed Playwright channel. `CACTUS_BASE_URL` can point to a Vite preview server. API responses are fixtures; no live trip records are modified. Screenshots are saved to `outputs/cactus-pilot/` at desktop (1280px) and mobile (390px); a 320px viewport is also tested.

- `node --test tests/destinationPartners.test.mjs`: 3 passed.
- `npm run test:partners:browser`: 5 passed, including all placements, responsive layout/touch targets, loaded image, new-tab events/directions, tracking, save/retry/persistence, destination restriction and absence on Game Day.
- `npm test`: 84 passed, 4 failed. All four failures reproduce without this implementation: stale source-string expectations in `contracts.test.mjs` (Northwestern venue context) and `journeyScreens.test.mjs` (website fallback and demo query parsing), plus the pre-existing untracked `footballFallback.test.mjs` quota-outage JSON failure.
- `npm run lint`: existing two `react-hooks/preserve-manual-memoization` errors in `PartnerFieldTestReport.jsx`, plus existing `exhaustive-deps` warning in `App.jsx`. New component/data/metrics files pass focused ESLint.
- `npm run build`: passed.

Existing screens, other partner inventory and sales-preview behavior were not redesigned. No commit or push was made.
