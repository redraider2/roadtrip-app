# Culinary Gangster Tempe campaign

Campaign eligibility uses the active trip's canonical venue ID `3947` (Arizona State / Mountain America Stadium), with the existing exact-ID destination matcher. Route selection alone never enables the campaign. Other destinations retain their partner behavior.

## Positions and actions — October 28, 2026 refresh

| Placement | Route | Creative | Primary / secondary |
| --- | --- | --- | --- |
| Trip HQ | `/#/trip-hq` | Burger, crinkle-cut fries and beer — Make Tempe your next bite | View Menu / Get Directions |
| Along the Way | `/#/plan-along-the-way` | Chicken Avocado Quinoa Bowl and citrus cocktail — Fresh fuel. Big flavor | View Menu |
| Game Weekend | `/#/game-weekend` | Street Gyros and cocktail — Wrap up your game plan | View Menu |
| Game Day | `/#/game-day` | Hot Honey Chicken, loaded fries and beer — Bring the heat | View Menu / Get Directions |

All four images link to the Tempe menu, matching the embedded Explore the Menu CTA. Directions buttons link to 501 S Mill Ave #200, Tempe, AZ.

Menu: `https://culinarygangsterusa.com/menu/tempe`

The four approved AI-assisted concept images are separate, versioned 1536 × 1024 PNGs under `public/partners/`, suffixed `20261028`. Food imagery follows the Tempe menu; drinks are illustrative, unbranded pairings. Original assets remain in Git for rollback. Campaign targeting, disclosure, responsive layout and tracking remain in place. Sponsored companion titles, descriptions and context headings have explicit light colors to remain readable in the warm site theme.

Source artwork and page-named copies: https://drive.google.com/drive/folders/1YsvCHzpWfNRSnnFJ4OSyGSaeCDLC3V1e

The user explicitly authorized saving the four ads to Drive and publishing them to the production public website on October 28, 2026.

## Tracking and verification

Existing partner metrics record campaign/destination/placement/creative/action dimensions. Each mounted card records one impression after reaching 25% visibility. Image and CTA links record their own single action event. Ineligible destinations mount no campaign observer.

- 6 focused unit tests pass, covering targeting, mappings, approved links, four-creative asset integrity and analytics compatibility.
- Browser suite covers all four screens at 1280, 820, 390 and 320px, container-responsive geometry, full artwork, direct navigation/refresh, same-session destination switching, no duplicates, above-map adjacency, approved image and CTA targets, keyboard focus, single click events, placeholder absence, and preservation of real partner listings.
- Focused ESLint and production build pass.
- Release candidate on production commit `663351d`: full Node suite 78 pass, 6 fail. The unchanged production baseline has the same 6 failures (72 pass); the campaign adds 6 passing tests. Repository lint retains 2 existing errors in PartnerFieldTestReport and 1 existing App effect dependency warning.
- Screenshots: `outputs/culinary-tempe/` (desktop and 390px for each placement).

Preview: `http://localhost:5180`. Start with `npm run dev -- --host 127.0.0.1 --port 5180`; run `node --test tests/browser/culinaryGangster.test.mjs`. Tests use mocked API responses; no live trip records are changed. Select a road game at Arizona State (e.g. Baylor at Arizona State), create/open the Tempe trip, and use the four journey screens. Changing to a different destination removes the campaign.

Production release uses the existing Vercel Git integration: repository `redraider2/roadtrip-app`, production branch `main`, domain `www.kickoffmiles.com`. No backend or environment changes are required. Unrelated local changes are excluded.
