import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PUBLIC_PAGES, SITE_ORIGIN } from "../src/screens/publicPages.js";

export const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRepository = "https://github.com/redraider2/roadtrip-app.git";
const git = (args, cwd = repositoryRoot) => execFileSync("git", args, {
  cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
}).trim();
const xml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");

export function renderSitemap(pages, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("A real source revision is required.");
  const seen = new Set();
  const entries = pages.map(({ url, lastmod }) => {
    const parsed = new URL(url);
    if (parsed.origin !== SITE_ORIGIN || parsed.hash || parsed.search || seen.has(url)) {
      throw new Error(`Invalid or duplicate canonical page: ${url}`);
    }
    seen.add(url);
    if (!lastmod || !Number.isFinite(Date.parse(lastmod))) throw new Error(`Missing real modification date for ${url}`);
    return `  <url>\n    <loc>${xml(url)}</loc>\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Source revision: ${revision} -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function pageModificationDate(page, revision, historyRoot = repositoryRoot) {
  if (!page.contentSources?.length) throw new Error(`Content sources required for ${page.path}`);
  const date = git(["log", "--no-renames", "-1", "--format=%cI", revision, "--", ...page.contentSources], historyRoot);
  if (!date) throw new Error(`No modification history for ${page.path}; never substitute the build date.`);
  return date;
}

export async function generateSitemap() {
  // Vercel may omit .git or provide shallow history. Resolve the exact deployed
  // revision against full, blob-filtered history instead of inventing dates.
  let revision = process.env.VERCEL_GIT_COMMIT_SHA;
  let historyRoot = repositoryRoot;
  let temporaryHistory;
  try {
    revision ||= git(["rev-parse", "HEAD"]);
    if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Invalid source revision");
    let complete = false;
    try {
      complete = git(["rev-parse", "--is-shallow-repository"]) === "false";
      git(["cat-file", "-e", `${revision}^{commit}`]);
    } catch { complete = false; }
    if (!complete) {
      temporaryHistory = await mkdtemp(path.join(tmpdir(), "kickoff-sitemap-history-"));
      historyRoot = temporaryHistory;
      git(["init", "--bare"], historyRoot);
      git(["fetch", "--filter=blob:none", sourceRepository, revision], historyRoot);
    }
    const pages = PUBLIC_PAGES.map((page) => ({
      url: new URL(page.path, SITE_ORIGIN).href,
      lastmod: pageModificationDate(page, revision, historyRoot),
    }));
    return { revision, pages, sitemap: renderSitemap(pages, revision) };
  } finally {
    if (temporaryHistory) await rm(temporaryHistory, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { sitemap } = await generateSitemap();
  process.stdout.write(sitemap);
}
