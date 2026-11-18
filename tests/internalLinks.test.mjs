import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_PAGES, SITE_ORIGIN, getRelatedPublicPages } from "../src/screens/publicPages.js";
import { generateInformationPages } from "../scripts/generate-information-pages.mjs";

const generated = await generateInformationPages(["assets/site.css"]);
const documents = new Map([["/", generated.homeLinks], ...generated.pages.map((page) => [page.path, page.html])]);
const links = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
  url: new URL(match[1], SITE_ORIGIN),
  text: match[2].replace(/<[^>]*>/g, "").trim(),
}));

test("every public information page links to 2–5 distinct neighboring documents with descriptive anchors", () => {
  const registeredPaths = new Set(PUBLIC_PAGES.map(({ path }) => path));
  for (const [path, html] of documents) {
    const neighbors = links(html).filter(({ url }) => url.origin === SITE_ORIGIN && !url.hash && url.pathname !== path);
    const unique = new Set(neighbors.map(({ url }) => url.pathname));
    assert.ok(unique.size >= 2 && unique.size <= 5, `${path} has ${unique.size} document links`);
    for (const { url, text } of neighbors) {
      assert.ok(registeredPaths.has(url.pathname), `Unregistered destination: ${url.pathname}`);
      assert.ok(documents.has(url.pathname), `Missing generated page: ${url.pathname}`);
      assert.ok((text === "Home" || text.length > 15) && !/^(here|click here|read more|learn more)$/i.test(text), text);
    }
  }
});

test("every piece has three to five related links selected by its cluster and breadcrumbs", () => {
  for (const page of PUBLIC_PAGES.filter((page) => page.component && !page.isHub)) {
    const html = documents.get(page.path);
    const block = html.match(/<aside\b[^>]*aria-label="Related"[^>]*>([\s\S]*?)<\/aside>/)?.[1];
    assert.ok(block, `${page.path} lacks a related block`);
    const related = links(block);
    assert.ok(related.length >= 3 && related.length <= 5);
    assert.ok(related.every(({ url }) => url.pathname !== page.path && PUBLIC_PAGES.some((other) => other.path === url.pathname && other.cluster === page.cluster)));
    assert.deepEqual(related.map(({ url }) => url.pathname), getRelatedPublicPages(page.path).map((other) => other.path));
    const breadcrumbs = html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(breadcrumbs, `${page.path} lacks breadcrumbs`);
    const hub = PUBLIC_PAGES.find((other) => other.cluster === page.cluster && other.isHub);
    assert.deepEqual(links(breadcrumbs).map(({ url }) => url.pathname), ["/", hub.path]);
    assert.match(breadcrumbs, /aria-current="page"/);
  }
});

test("the topic hub links every piece and is linked from main navigation", () => {
  for (const hub of PUBLIC_PAGES.filter((page) => page.isHub)) {
    const targets = new Set(links(documents.get(hub.path)).map(({ url }) => url.pathname));
    const pieces = PUBLIC_PAGES.filter((page) => page.cluster === hub.cluster && !page.isHub);
    assert.ok(pieces.every((piece) => targets.has(piece.path)));
    assert.ok(links(generated.mainNavigation).some(({ url }) => url.pathname === hub.path));
    for (const page of generated.pages) assert.ok(page.html.includes('aria-label="Main navigation"'));
  }
});

test("every registered piece receives links from at least three other cluster documents", () => {
  for (const page of PUBLIC_PAGES.filter((page) => page.cluster && !page.isHub)) {
    const incoming = [...documents].filter(([path, html]) => path !== page.path && PUBLIC_PAGES.some((other) => other.path === path && other.cluster === page.cluster) && links(html).some(({ url }) => !url.hash && url.pathname === page.path));
    assert.ok(incoming.length >= 3, `${page.path} has only ${incoming.length} cluster recommendations`);
  }
});

test("the homepage link cluster reaches every registered public page without JavaScript", () => {
  const visited = new Set();
  const queue = ["/"];
  while (queue.length) {
    const path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    for (const { url } of links(documents.get(path))) {
      if (url.origin === SITE_ORIGIN && !url.hash && documents.has(url.pathname)) queue.push(url.pathname);
    }
  }
  assert.deepEqual([...visited].sort(), PUBLIC_PAGES.map(({ path }) => path).sort());
});

test("standalone content retains one H1, unique canonical metadata, and functional non-JavaScript controls", () => {
  for (const page of generated.pages) {
    assert.equal([...page.html.matchAll(/<h1\b/g)].length, 1, page.path);
    assert.ok(page.html.includes(`rel="canonical" href="${SITE_ORIGIN}${page.path}"`));
    assert.ok(page.description.length >= 110 && page.description.length <= 160, page.path);
    assert.ok(!/<script\b/.test(page.html), "Information documents do not need the app bundle");
  }
  assert.match(documents.get("/faq.html"), /<details[^>]*class="home-faq-item"/);
  assert.ok(documents.get("/sample-trip.html").includes('href="/#/choose-team"'));
  assert.ok(documents.get("/sample-trip.html").includes('href="/#/destinations"'));
  assert.ok(!/<button\b/.test(documents.get("/sample-trip.html")), "Standalone sample actions must be links");
});
