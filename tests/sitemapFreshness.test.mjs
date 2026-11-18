import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pageModificationDate, renderSitemap } from "../scripts/generate-sitemap.mjs";
import { indexNowPayload, notifyPublishedPages } from "../scripts/ping-indexnow.mjs";

const revision = "a".repeat(40);
const pages = [{ url: "https://www.kickoffmiles.com/", lastmod: "2026-11-01T12:00:00Z" }];
const expected = { revision, pages, sitemap: renderSitemap(pages, revision) };

test("lastmod follows page history and stays unchanged after unrelated commits", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "sitemap-date-test-"));
  const git = (args, date) => execFileSync("git", args, { cwd, encoding: "utf8", env: {
    ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com",
    GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date,
  } }).trim();
  try {
    git(["init", "-q"]);
    await writeFile(path.join(cwd, "page.txt"), "First content");
    git(["add", "."]); git(["commit", "-qm", "Page content"], "2026-11-01T12:00:00Z");
    const page = { path: "/", contentSources: ["page.txt"] };
    const first = pageModificationDate(page, "HEAD", cwd);
    await writeFile(path.join(cwd, "unrelated.txt"), "Build configuration");
    git(["add", "."]); git(["commit", "-qm", "Unrelated"], "2026-11-05T12:00:00Z");
    assert.equal(pageModificationDate(page, "HEAD", cwd), first);
    await writeFile(path.join(cwd, "page.txt"), "Updated content");
    git(["add", "."]); git(["commit", "-qm", "Update page"], "2026-11-10T12:00:00Z");
    assert.equal(Date.parse(pageModificationDate(page, "HEAD", cwd)), Date.parse("2026-11-10T12:00:00Z"));
    assert.throws(() => pageModificationDate({ path: "/missing", contentSources: ["missing"] }, "HEAD", cwd), /No modification history/);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("sitemap requires real dates and canonical URLs without fragments", () => {
  assert.match(expected.sitemap, /<lastmod>2026-11-01T12:00:00.000Z<\/lastmod>/);
  assert.throws(() => renderSitemap([{ ...pages[0], lastmod: "" }], revision), /modification date/);
  assert.throws(() => renderSitemap([{ ...pages[0], url: pages[0].url + "#/home" }], revision), /canonical page/);
  assert.throws(() => renderSitemap([...pages, ...pages], revision), /duplicate/);
});

for (const status of [200, 202]) test(`one IndexNow POST follows live sitemap/key verification (${status})`, async () => {
  const calls = [];
  const payload = indexNowPayload(pages);
  const fetchFn = async (url, options) => {
    calls.push({ url, options });
    return new Response(url.endsWith("sitemap.xml") ? expected.sitemap : url === payload.keyLocation ? payload.key : "", { status: url.includes("api.indexnow.org") ? status : 200 });
  };
  assert.equal(await notifyPublishedPages(expected, { fetchFn }), status);
  const posts = calls.filter(({ options }) => options.method === "POST");
  assert.equal(posts.length, 1);
  assert.deepEqual(JSON.parse(posts[0].options.body), payload);
});

test("unpublished revision and missing key never send an IndexNow POST", async () => {
  for (const missingKey of [false, true]) {
    const methods = [];
    await assert.rejects(notifyPublishedPages(expected, { attempts: 1, fetchFn: async (url, options) => {
      methods.push(options.method);
      return new Response(url.endsWith("sitemap.xml") && missingKey ? expected.sitemap : "wrong content");
    } }), /no IndexNow request sent/);
    assert.ok(!methods.includes("POST"));
  }
});

test("IndexNow failures are surfaced instead of reported as success", async () => {
  const payload = indexNowPayload(pages);
  await assert.rejects(notifyPublishedPages(expected, { fetchFn: async (url) => new Response(
    url.endsWith("sitemap.xml") ? expected.sitemap : url === payload.keyLocation ? payload.key : "Rejected",
    { status: url.includes("api.indexnow.org") ? 403 : 200 },
  ) }), /IndexNow returned 403/);
});
