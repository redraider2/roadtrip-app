import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { generateSitemap } from "./scripts/generate-sitemap.mjs";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/roadtrip-app/" : "/",
  plugins: [react(), {
    name: "canonical-sitemap",
    apply: "build",
    async generateBundle() {
      const { sitemap } = await generateSitemap();
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
    },
  }],
}));
