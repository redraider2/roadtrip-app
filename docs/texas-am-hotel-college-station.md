# Texas A&M Hotel — College Station

User authorized adding the four supplied concepts to the SEC College Station / Texas A&M destination and pushing to public view on November 2, 2026. Eligibility is exact venue ID `3795` (Kyle Field); it follows the destination, not the visitor's chosen team.

| Screen | Supplied image | Creative |
| --- | --- | --- |
| Trip HQ and public destination detail | 01-trip-hq.png | Make campus your home base |
| Along the Way | 02-along-the-way.png | The miles end. Your weekend begins |
| Game Weekend | 03-game-weekend.png | Check in. Settle in. Soak it all in |
| Game Day | 04-game-day.png | Maroon 96 yards panel |

The maroon `96` creative has an explicit allowlist of `game_weekend` and `game_day`, preventing accidental placement in Trip HQ, Along the Way or global screens. Its current assignment is Game Day only; Game Weekend retains the supplied third design.

The PNGs are copied byte-for-byte under `public/partners/texas-am-hotel-*-20261102.png`. An SVG viewport displays each creative panel, excluding the concept-page navigation, review label, and “not live” footer; no source imagery is regenerated or rewritten. Mobile layouts retain accessible native text and a full-size booking button alongside the artwork. All images and Book Now buttons point to the verified official hotel website, https://www.texasamhotelcc.com/ (the site's own booking entry point). The official FAQ supports the 96-yard proximity: https://www.texasamhotelcc.com/about/faqs/ . No discount, inventory or game-weekend availability is promised.

The shared campaign renderer now uses campaign business/market labels and action labels. Existing Tempe images, actions, destination targeting and metrics are preserved. Impression/click events continue to include campaign, destination, creative and placement dimensions.

Validation: 8 campaign unit checks and 11 browser checks pass (hotel and existing Tempe campaigns). Hotel browser checks cover all four journey screens at 1280px and 390px, public destination detail, out-of-market exclusion, booking links and single click events. Screenshots are in `outputs/college-station-hotel/`. Focused ESLint and production build pass. Full unit suite: 111 pass / 4 fail; clean HEAD baseline: 109 pass / the same 4 failures (missing game-day inventory fixture and three pre-existing journey source assertions). No new failures. No backend/data/schema/environment changes.

Production uses the existing Vercel integration from `main` in `redraider2/roadtrip-app` to www.kickoffmiles.com. Public destination: https://www.kickoffmiles.com/#/destinations?market=DEST-013 .
