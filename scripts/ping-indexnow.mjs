import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { generateSitemap } from "./generate-sitemap.mjs";
import { SITE_ORIGIN } from "../src/screens/publicPages.js";

const config = JSON.parse(await readFile(new URL("./indexnow-config.json", import.meta.url), "utf8"));

export function indexNowPayload(pages) {
  if (config.host !== new URL(SITE_ORIGIN).host || !/^[a-f0-9]{32}$/.test(config.key)) {
    throw new Error("IndexNow host/key configuration is invalid.");
  }
  const urlList = [...new Set(pages.map(({ url }) => url))];
  if (!urlList.length || urlList.length > 10000 || urlList.some((url) => {
    const parsed = new URL(url);
    return parsed.origin !== SITE_ORIGIN || parsed.hash || parsed.search;
  })) throw new Error("IndexNow requires 1–10,000 canonical URLs on the production host.");
  return { host: config.host, key: config.key, keyLocation: `${SITE_ORIGIN}/${config.key}.txt`, urlList };
}

export async function notifyPublishedPages(expected, { fetchFn = fetch, attempts = 6, pause = delay } = {}) {
  const payload = indexNowPayload(expected.pages);
  // A successful build is not a publication. Require the canonical host to serve
  // this exact revision and sitemap before issuing the single IndexNow POST.
  let published = false;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchFn(`${SITE_ORIGIN}/sitemap.xml`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      published = response.ok && (await response.text()).trim() === expected.sitemap.trim();
    } catch { published = false; }
    if (published) break;
    if (attempt + 1 < attempts) await pause(5000);
  }
  if (!published) throw new Error("Production is not serving this revision's sitemap; no IndexNow request sent.");

  const keyResponse = await fetchFn(payload.keyLocation, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== payload.key) {
    throw new Error("The IndexNow ownership key is not live; no IndexNow request sent.");
  }
  const response = await fetchFn("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  console.log(`IndexNow ${response.status}: submitted ${payload.urlList.length} production URL(s) for ${expected.revision}. Receipt does not guarantee indexing.`);
  return response.status;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await notifyPublishedPages(await generateSitemap());
}
