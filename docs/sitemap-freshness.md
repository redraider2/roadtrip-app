# Sitemap freshness and IndexNow

The application is React/Vite on Vercel. Its canonical public documents are
the homepage and the existing About, FAQ, and sample-trip content published at
`/about.html`, `/faq.html`, and `/sample-trip.html`, plus the topic hub at
`/planning.html`. Journey screens use URL
fragments; they are not separate sitemap entries. There is no daily-post CMS.

`src/screens/publicPages.js` supplies both public navigation and the sitemap's
canonical page records. When adding an independently addressable public page,
add its path and content sources to that registry. Do not add fragment routes,
private trip/account URLs, or verification files.

Every Vite production build emits `dist/sitemap.xml`. Each `lastmod` is the
committer timestamp of the most recent Git change to that page's listed content
sources, including its markup, shared shell, styles, and imagery. An unrelated
build/configuration commit does not refresh the timestamp. This tracks source
modification, not build/publish time or database activity. Source-only refactoring
inside a shared content file may also count as a modification. Keep each page's
source list accurate as components are added or removed.

Builds with absent or shallow Git history fetch full, blob-filtered history of
the exact source revision into a temporary directory, then remove it. Dates
never fall back to the current clock. A build fails if history cannot establish
the real date. This requires read access to the public source repository.

The sitemap's revision comment identifies the deployed build without changing
page `lastmod` values. `npm run sitemap:generate` prints the generated XML.

`.github/workflows/indexnow-publish.yml` runs only after successful Production
deployment statuses, or a manual dispatch on main. It checks the live canonical
sitemap against the exact deployed revision and checks that the public ownership
key is served correctly. It then sends one POST to IndexNow with the published
canonical page URLs. Preview and failed deployments do not submit URLs. This
site currently publishes five canonical documents, so the payload contains those URLs.

The generated ownership key is a public verification token, hosted as a root
text file and configured in `scripts/indexnow-config.json`; no account or secret
is required. IndexNow HTTP 200 means receipt; 202 means receipt with ownership
validation pending. Neither response guarantees indexing. Other responses fail
the workflow rather than being reported as success.

Verification: inspect the live sitemap, compare `lastmod` to
`git log -1 --format=%cI -- <contentSources>`, and inspect the latest
"Notify IndexNow after production publish" Actions run for the accepted status.
`node --test tests/sitemapFreshness.test.mjs` verifies date stability, updated
content dates, canonical URL constraints, publication gating, and single POST
behavior. An IndexNow failure can be retried by dispatching the workflow on main;
the script still refuses to submit until that revision is live.
