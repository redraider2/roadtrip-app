# Culinary Gangster Tempe campaign

Campaign eligibility uses the active trip's canonical venue ID `3947` (Arizona State / Mountain America Stadium), with the existing exact-ID destination matcher. Route selection alone never enables the campaign. Other destinations retain their partner behavior.

## Positions and actions

| Placement | Route | Position | Creative | Primary / secondary |
| --- | --- | --- | --- | --- |
| Trip HQ | `/#/trip-hq` | After main trip navigation, before Your Trip Workspace | A: directions | Get Directions / View Menu |
| Along the Way | `/#/plan-along-the-way` | After introduction, before recommendations; “When you reach Tempe” | B: game-day appetite | View Menu |
| Game Weekend | `/#/game-weekend` | Immediately before Game Weekend Map | C: Big flavor | View Menu |
| Game Day | `/#/game-day` | After introduction, before guide topics | B: game-day appetite | View Menu / Get Directions |

Menu: `https://culinarygangsterusa.com/menu/tempe`

Directions: `https://www.google.com/maps/dir/?api=1&destination=501%20S%20Mill%20Avenue%2C%20Tempe%2C%20AZ`

Both destinations were supplied/confirmed by the user. The image is a separate link to its embedded CTA's target, not a wrapper around other links. All external links use a new tab and `noopener noreferrer`.

## Shared layout and assets

`DestinationArtworkPlacement` uses a roughly 65/35 grid for Trip HQ, Along the Way and Game Weekend after accounting for a 24px gap, with 16px padding and uncropped artwork at automatic height. A named container query stacks these cards when their content width is 720px or less; small screens use 12px padding. Game Day retains its previous ratio and breakpoint. Gold primary actions and outlined secondary actions include hover, focus-visible and pressed states. HTML disclosure, title, placement-specific sentence and the unchanged address remain readable independently of the image.

All three original 1536 × 1024 PNGs in `public/partners/culinary-gangster-tempe-*.png` are preserved byte-for-byte. No new artwork or runtime local-machine paths are used.

Empty Coming Soon rails are hidden only alongside this active campaign. Real destination partner listings remain visible, including Trip HQ. The old below-map campaign instance and sample partner are absent when the Tempe card is displayed.

## Tracking and verification

Existing partner metrics record campaign/destination/placement/creative/action dimensions. Each mounted card records one impression after reaching 25% visibility. Image and CTA links record their own single action event. Ineligible destinations mount no campaign observer.

- 6 focused unit tests pass, covering targeting, mappings, approved links, asset integrity and analytics compatibility.
- Browser suite covers all four screens at 1280, 820, 390 and 320px, container-responsive geometry, full artwork, direct navigation/refresh, same-session destination switching, no duplicates, above-map adjacency, approved image and CTA targets, keyboard focus, single click events, placeholder absence, and preservation of real partner listings.
- Focused ESLint and production build pass.
- Release candidate on production commit `663351d`: full Node suite 78 pass, 6 fail. The unchanged production baseline has the same 6 failures (72 pass); the campaign adds 6 passing tests. Repository lint retains 2 existing errors in PartnerFieldTestReport and 1 existing App effect dependency warning.
- Screenshots: `outputs/culinary-tempe/` (desktop and 390px for each placement).

Preview: `http://localhost:5180`. Start with `npm run dev -- --host 127.0.0.1 --port 5180`; run `node --test tests/browser/culinaryGangster.test.mjs`. Tests use mocked API responses; no live trip records are changed. Select a road game at Arizona State (e.g. Baylor at Arizona State), create/open the Tempe trip, and use the four journey screens. Changing to a different destination removes the campaign.

Production release uses the existing Vercel Git integration: repository `redraider2/roadtrip-app`, production branch `main`, domain `www.kickoffmiles.com`. No backend or environment changes are required. Unrelated local changes are excluded.
