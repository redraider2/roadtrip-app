import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { generateSitemap } from "./scripts/generate-sitemap.mjs";
import { PUBLIC_PAGES } from "./src/screens/publicPages.js";
import { structuredDataScript } from "./src/screens/siteStructuredData.js";
import { generateInformationPages } from "./scripts/generate-information-pages.mjs";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/roadtrip-app/" : "/",
  plugins: [react(), {
    name: "canonical-sitemap",
    apply: "build",
    async generateBundle() {
      const { sitemap } = await generateSitemap();
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
    },
  }, {
    name: "linked-information-pages",
    apply: "build",
    enforce: "post",
    async generateBundle(_options, bundle) {
      const base = mode === "github-pages" ? "/roadtrip-app/" : "/";
      const stylesheets = Object.keys(bundle).filter((file) => file.endsWith(".css"));
      const { pages, homeLinks, mainNavigation } = await generateInformationPages(stylesheets, base);
      const index = bundle["index.html"];
      if (!index || !String(index.source).includes("<!-- planning-information-links -->")) {
        throw new Error("Homepage internal-link insertion point is missing.");
      }
      index.source = String(index.source).replace("</head>", `${structuredDataScript(PUBLIC_PAGES.find((page) => page.id === "home"))}</head>`);
      index.source = String(index.source).replace("<!-- planning-information-links -->", homeLinks);
      if (!String(index.source).includes("<!-- planning-main-navigation -->")) throw new Error("Homepage main-navigation insertion point is missing.");
      index.source = String(index.source).replace("<!-- planning-main-navigation -->", mainNavigation);
      for (const page of pages) this.emitFile({ type: "asset", fileName: page.path.slice(1), source: page.html });
    },
  }],
}));
