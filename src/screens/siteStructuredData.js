import { SITE_ORIGIN } from "./publicPages.js";
import { FAQ_QUESTIONS } from "../data/homeFaq.js";

// Verified in HeyCatch Settings → Social accounts → Kickoff Miles on 2026-11-18.
// Use the connected account handles/ID, never guessed business-name variants.
export const OFFICIAL_PROFILE_URLS = [
  "https://www.instagram.com/kickoffmiles/",
  "https://www.facebook.com/1454843144369198",
  "https://x.com/kickoffmiles",
];

export function siteStructuredData(page) {
  const url = new URL(page.path, SITE_ORIGIN).href;
  const organizationId = `${SITE_ORIGIN}/#organization`;
  const websiteId = `${SITE_ORIGIN}/#website`;
  const pageTypes = { about: "AboutPage", faq: "FAQPage", "planning-guides": "CollectionPage" };
  // These are application/help pages, not news articles: no invented bylines,
  // publication dates, or Article markup just to satisfy an audit template.
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Kickoff Miles",
        url: `${SITE_ORIGIN}/`,
        logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/kickoff-miles-logo.png`, width: 1254, height: 1254 },
        email: "support@kickoffmiles.com",
        ...(OFFICIAL_PROFILE_URLS.length ? { sameAs: OFFICIAL_PROFILE_URLS } : {}),
      },
      { "@type": "WebSite", "@id": websiteId, name: "Kickoff Miles", url: `${SITE_ORIGIN}/`, publisher: { "@id": organizationId } },
      {
        "@type": pageTypes[page.id] || "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.title,
        description: page.description,
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        ...(page.id === "faq" ? { mainEntity: FAQ_QUESTIONS.map(({ question, answer }) => ({
          "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer },
        })) } : {}),
      },
    ],
  };
}

export function structuredDataScript(page) {
  return `<script type="application/ld+json">${JSON.stringify(siteStructuredData(page)).replaceAll("<", "\\u003c")}</script>`;
}
