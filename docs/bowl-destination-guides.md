# Bowl and CFP destination guides

Adds a separate Bowls & CFP catalog under Explore Destinations and a guide link in the game picker. The 37 guides cover the announced 2026–27 bowl host venues, including the seven neutral CFP sites. Campus first-round playoff games continue using the existing college-town coverage.

Each host guide includes arrival and entry planning, links to the venue or event organizer, local dining/stay/activity recommendations, and visitor information. Trip HQ links to the full guide; Game Weekend displays it; Game Day uses event/venue resources instead of regular-season campus rules. The existing paid-partner selection remains ahead of editorial fallback recommendations.

## Source and identity rules

CFBD `/venues` provides stable venue IDs, names, and cities. `/games?year=2025&seasonType=postseason` supplies historical bowl/CFP evidence; `/games?year=2026&seasonType=postseason` returned no records on November 18, 2026. Historical host assignments are not treated as current assignments.

Current host assignments were checked against [Bowl Season](https://bowlseason.com/sports/bowl/schedule/2026-27) and the [CFP schedule](https://collegefootballplayoff.com/sports/2018/8/31/cfp-games-schedule). Exact provider identities are retained in `src/data/bowlDestinations.json`; the public evidence snapshot is in `docs/research/bowl-venue-evidence-2026.json`. No API keys or account information are included.

Notable current assignments: [Cure Bowl at UCF](https://www.curebowl.com/stadium/), [Frisco's two games at Ford Center](https://www.visitfrisco.com/press-room/frisco-to-host-two-bowl-games-december-2026), and Cactus Bowl in Tempe rather than the previous Rate Bowl site at Chase Field. Orlando has separate entries for the UCF and Camping World venues.

The API labels Independence Stadium's state as FL, while the official host listing identifies Shreveport, Louisiana. Trip creation corrects the city/state using the reviewed exact-venue mapping. The source also retains older venue names (for example FAU Stadium), so the guide stores the current host name separately from the provider name.

San Juan and Bayamón have official [San Juan Bowl](https://www.sanjuanbowl.com/) and [Puerto Rico Bowl](https://www.discoverpuertorico.com/regions/puerto-rico-bowl-2026) host information but no corresponding CFBD venue IDs in the retrieved directory. Their city guides are browsable now. No numeric IDs are fabricated or matched by city alone. `scripts/review-bowl-venue-mappings.mjs` performs a read-only provider reconciliation using the existing `CFBD_API_KEY` environment variable and reports newly available exact-name/city candidates for review.

New recommendations use official operator or visitor-bureau sources. Existing city recommendations are reused with their original source-check dates and provenance; the campus-specific Game Day entries are excluded from the postseason inventory. Links were checked for availability, with official indexed pages consulted where sites block direct scripted requests. No opening hours, rates, vacancy, event parking prices, or tailgating permissions are invented. Hotels and attractions can be elsewhere in the metro area; the guides do not promise stadium walking access.

## Verification and release

- `node --test tests/bowlDestinations.test.mjs tests/destinationPicks.test.mjs tests/destinationPopulation.test.mjs tests/postseasonSchedule.test.mjs`
- `npm run build`
- `JOURNEY_BASE_URL=http://127.0.0.1:4174 node tests/browser/bowlDestinations.test.mjs` against a local production preview.

Browser checks cover all 37 guides on desktop, selected mobile guides, CFP search, type switching, deep links, trip integration, and exclusion of campus-only rules. Browser trip data is synthetic. The regular college catalog remains 136 destinations. The full suite has six unrelated pre-existing failures in guide inventory and legacy source assertions.

This change needs a frontend release only. It does not modify the production guide database, backend configuration, sponsorships, or game schedules. San Juan/Bayamón venue bindings need a catalog update after CFBD supplies identifiers; later seasons require a fresh host-assignment review.
