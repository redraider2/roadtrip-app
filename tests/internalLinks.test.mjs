import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_PAGES, SITE_ORIGIN } from "../src/screens/publicPages.js";
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
      assert.ok(text.length > 15 && !/^(here|click here|read more|learn more)$/i.test(text), text);
    }
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
