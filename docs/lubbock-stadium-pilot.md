# Lubbock stadium pilot

Adds the approved image-rich stadium treatment for host venue 3784 only: Trip HQ, Game Weekend, Game Day, and public Lubbock browsing. No other venue is activated. The original shared introduction, team selection, and game selection are unchanged in this destination pilot.

The Texas Tech photo, creator, original 2013 title, photo date, source link, CC BY 2.0 link, and crop/overlay disclosure travel together in stadiumProfiles.js. The display name is Galaxy Stadium; the historical photograph title is retained in its attribution. A failed image leaves the destination sign and a readable fallback. Profiles match host venue IDs, never the selected fan's team.

Existing advertisers, targeting, recommendations, maps, trip controls, all four guide sections, and Game Weekend/Game Day navigation are retained. No backend or database changes. For Lubbock's maps only, automatic camera positioning is unanimated to prevent a Leaflet callback firing after the map unmounts during screen navigation. Other destinations retain default camera behavior.

## Published baseline

Built clean main commit 452c7fdb440d26d4f25817c93cf74f1f140fb32e with npm ci and VITE_API_URL=https://roadtrip-app-53u2.onrender.com. Before edits, both output files were byte-identical to files downloaded from www.kickoffmiles.com on October 23, 2026:

- index-4gHLfroj.js SHA256: 1be5d7586983969361fc45ab61b6dc1d897d082fa899107c60d8fd115e7d20d0
- index-BDezHwqq.css SHA256: dd7c618c7a5d75973c741e5d2f6ed5bb58863b7b83b9c06e119b955d4bd03bcd

Implementation uses a separate checkout so the existing IDE working tree is not modified.

## Validation

- Production build passes; existing bundle-size advisory remains.
- Focused ESLint: no errors; existing App effect dependency warning remains.
- Three stadium profile tests pass: host scoping, bundled asset and attribution, separate Weekend/Day identity.
- Seven browser tests pass: 1280/820/390/320px, photo/credits/sign, maps, partner inventory, Cactus links/save analytics, all guide sections, public destination switching, neutral homepage, image failure, and a selected away-game destination that differs from a stored Lubbock trip.
- Seven Tempe artwork browser tests pass.
- Five Nashville/guide browser tests pass.
- Full unit suite: 109 pass, six fail. Untouched production baseline: 106 pass, the same six fail. These are existing source-contract assertions for Northwestern, commercial fallback, demo parsing and Trip HQ markup, plus two workbook inventory checks against the available local R6 file. No new unit failures.

## Release and rollback

Review the branch deployment for the production Vercel project before merging. After deployment, verify /#/destinations?market=DEST-008, photo/credit links, neutral homepage and another destination. If rollback is needed, revert only this pilot's commit (or its merge commit), rebuild, and redeploy through the same Vercel project. No data rollback is required. Do not run the separate GitHub Pages deployment script for the Vercel custom domain.
