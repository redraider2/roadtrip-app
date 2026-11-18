import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { PUBLIC_PAGES, SITE_ORIGIN } from "../src/screens/publicPages.js";

const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function generateInformationPages(stylesheets, base = "/") {
  // Render the existing public content components, rather than copying their
  // text into a second set of pages or inventing articles for the link count.
  const server = await createServer({
    configFile: false,
    envFile: false,
    root: fileURLToPath(new URL("../", import.meta.url)),
    base,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const load = async (name) => (await server.ssrLoadModule(`/src/components/${name}.jsx`)).default;
    const Header = await load("Header");
    const Background = await load("Background");
    const Links = await load("PlanningInformationLinks");
    const Breadcrumbs = await load("PlanningBreadcrumbs");
    const MainNavigation = await load("PlanningMainNavigation");
    const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));
    const homeLinks = render(Links);
    const mainNavigation = render(MainNavigation);
    const pages = [];
    for (const page of PUBLIC_PAGES.filter(({ component }) => component)) {
      const Component = await load(page.component);
      const canonical = new URL(page.path, SITE_ORIGIN).href;
      const body = render(Component, { standalone: true });
      const content = page.id === "about" ? `<section class="information-page-about">${body}</section>` : body;
      const html = `<!doctype html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(page.title)} | Kickoff Miles</title>
<meta name="description" content="${escape(page.description)}">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:title" content="${escape(page.title)} | Kickoff Miles">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:image" content="${SITE_ORIGIN}/kickoff-miles-social.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Kickoff Miles — The College Football Roadtrip Planner">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(page.title)} | Kickoff Miles">
<meta name="twitter:description" content="${escape(page.description)}">
<meta name="twitter:image" content="${SITE_ORIGIN}/kickoff-miles-social.png">
<meta name="twitter:image:alt" content="Kickoff Miles — The College Football Roadtrip Planner">
<link rel="icon" type="image/png" href="${base}kickoff-miles-logo.png">
${stylesheets.map((file) => `<link rel="stylesheet" href="${base}${file}">`).join("\n")}
</head><body><div class="page is-home">${render(Background)}
<main class="app is-home">${render(Header)}
${render(Breadcrumbs, { page })}
<h1 class="information-page-title">${escape(page.title)}</h1>
${content}
${render(Links, { currentPath: page.path, related: true })}
</main></div></body></html>\n`;
      pages.push({ ...page, html });
    }
    return { pages, homeLinks, mainNavigation };
  } finally {
    await server.close();
  }
}
