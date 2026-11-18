# Security header rollout

`vercel.json` adds the requested HTTP headers to every Vercel path, including
the homepage, fragment-based journey screens (which load the homepage), assets,
crawl files, and the CSP reporting endpoint. Existing HSTS is left untouched.

Enforced now: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a CSP containing only
`frame-ancestors 'none'`. The latter matches the frame denial without imposing
script/resource restrictions on the first day.

The fuller resource policy is deliberately in
`Content-Security-Policy-Report-Only`. It observes script/resource violations
without blocking them. Inline styles remain allowed for React/Leaflet; HTTPS
images are allowed for external team logos and destination imagery. Observed
backend, map, and analytics destinations are listed explicitly for connections.

Both modern `report-to` / `Reporting-Endpoints` and legacy `report-uri` send
browser reports to `/api/csp-report`. This Vercel function accepts bounded JSON
reports and writes sanitized `csp-violation` entries to Vercel Runtime Logs.
Only document/blocked origins, directive, and disposition are logged; full URLs,
queries, fragments, script samples, and referrers are discarded. Reports from
other document origins are ignored. Browser report delivery is best-effort.

After one week of representative production traffic (on or after November 25,
2026 for the initial November 18 deployment), review these logs and test the
homepage, account flow, routes/maps, and destination views. Adjust the resource
allowlist for legitimate traffic, then move the reviewed restrictions into the
enforced CSP. Do not automatically enforce an unreviewed policy on a timer.

Flag: log retention/access depends on the Vercel plan. Review/export Runtime
Logs during the observation week; this implementation does not provision a
durable reporting service. A scanner that requires an enforced script policy
may not award its full CSP score during this intentional reporting phase.

Verify using `curl -I https://www.kickoffmiles.com/` and the same command for
`/sitemap.xml` and `/robots.txt`. Check the four requested header names and the
reporting header. A valid CSP report POST should return 204; malformed JSON
returns 400, oversized bodies 413, and non-POST requests 405.
