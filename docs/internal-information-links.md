# Public information link cluster

The initial homepage HTML previously contained no anchor links. Its app buttons
and destination hashes did not expose separate crawlable content documents.

The existing About, FAQ, and sample-trip components are now also rendered at
build time to `/about.html`, `/faq.html`, and `/sample-trip.html`. These are
ordinary HTML documents using existing content, styles, and branding. No
articles, testimonials, destinations, or business facts were invented. The
original homepage sections and planning flow stay available.

`PlanningInformationLinks` provides descriptive links from the homepage to all
three information pages. Each information page links to the homepage and its
two peers. The links appear in initial HTML and work without JavaScript. The
standalone FAQ uses native disclosures; sample-trip actions are real links back
to the interactive planner.

`PUBLIC_PAGES` owns each canonical path, link label, metadata, component, and
content-source history. `journeyScreen` distinguishes the existing home app
screen from standalone documents; no hash routes were renamed or added.
`generate-information-pages.mjs` renders the shared components into Vite build
assets. The existing sitemap generator and post-publish IndexNow workflow now
include all four registered canonical URLs.

Verification: fetch each canonical URL, inspect its initial HTML links, and
follow the cluster from the homepage. Every page should have three distinct
neighboring-document links, one H1, and its own canonical and description. Run
`node --test tests/internalLinks.test.mjs` to check the graph for missing or
orphaned pages and validate descriptive anchors and standalone controls.

There are no article pages on the site. The original `#/…` planner and
destination screens remain app navigation, not additional sitemap documents.
