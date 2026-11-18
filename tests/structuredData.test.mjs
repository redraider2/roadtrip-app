import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_PAGES, SITE_ORIGIN } from "../src/screens/publicPages.js";
import { FAQ_QUESTIONS } from "../src/data/homeFaq.js";
import { siteStructuredData, structuredDataScript, OFFICIAL_PROFILE_URLS } from "../src/screens/siteStructuredData.js";

test("all canonical pages identify the same organization, website, and their own document", () => {
  for (const page of PUBLIC_PAGES) {
    const data = siteStructuredData(page);
    const [org, site, document] = data["@graph"];
    assert.equal(data["@context"], "https://schema.org");
    assert.equal(org["@type"], "Organization");
    assert.equal(org.name, "Kickoff Miles");
    assert.equal(org.url, `${SITE_ORIGIN}/`);
    assert.equal(document.url, new URL(page.path, SITE_ORIGIN).href);
    assert.equal(document.publisher["@id"], org["@id"]);
    assert.equal(document.isPartOf["@id"], site["@id"]);
    assert.equal(site.publisher["@id"], org["@id"]);
    assert.ok(!("datePublished" in document));
    assert.deepEqual(org.sameAs || [], OFFICIAL_PROFILE_URLS);
    const script = structuredDataScript(page);
    assert.deepEqual(JSON.parse(script.slice(script.indexOf(">") + 1, -9)), data);
  }
});

test("FAQ structured answers match the visible source and page types reflect the actual content", () => {
  const document = (id) => siteStructuredData(PUBLIC_PAGES.find((page) => page.id === id))["@graph"][2];
  assert.equal(document("about")["@type"], "AboutPage");
  assert.equal(document("planning-guides")["@type"], "CollectionPage");
  assert.equal(document("faq")["@type"], "FAQPage");
  assert.deepEqual(document("faq").mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), FAQ_QUESTIONS.map((q) => [q.question, q.answer]));
});
