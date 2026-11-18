import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import collector from "../api/csp-report.mjs";

test("Vercel applies the requested protection site-wide while script restrictions are report-only", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  const rule = config.headers.find(({ source }) => source === "/(.*)");
  const h = Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(h["x-content-type-options"], "nosniff");
  assert.equal(h["x-frame-options"], "DENY");
  assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin");
  assert.equal(h["content-security-policy"], "frame-ancestors 'none'");
  assert.match(h["content-security-policy-report-only"], /script-src 'self'/);
  assert.match(h["content-security-policy-report-only"], /report-uri \/api\/csp-report; report-to csp/);
  assert.match(h["reporting-endpoints"], /csp="https:\/\/www.kickoffmiles.com\/api\/csp-report"/);
});

test("collector accepts both browser report formats and removes sensitive payload fields", async (t) => {
  const logs = [];
  t.mock.method(console, "info", (...args) => logs.push(args));
  const cases = [
    { "csp-report": { "document-uri": "https://www.kickoffmiles.com/?token=private#trip", "effective-directive": "script-src-elem", "blocked-uri": "https://example.com/secret?token=private", "script-sample": "private" } },
    [{ type: "csp-violation", body: { documentURL: "https://www.kickoffmiles.com/#/home", effectiveDirective: "connect-src", blockedURL: "https://example.com/private" } }],
  ];
  for (const body of cases) {
    const r = await collector.fetch(new Request("https://www.kickoffmiles.com/api/csp-report", { method: "POST", headers: { "Content-Type": Array.isArray(body) ? "application/reports+json" : "application/csp-report" }, body: JSON.stringify(body) }));
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("cache-control"), "no-store");
  }
  assert.equal(logs.length, 2);
  assert.ok(!JSON.stringify(logs).includes("private"));
  assert.ok(!JSON.stringify(logs).includes("token"));
  assert.match(JSON.stringify(logs), /https:\/\/example.com/);
});

test("collector rejects invalid and oversized requests and ignores unrelated origins", async (t) => {
  const logs = [];
  t.mock.method(console, "info", (...args) => logs.push(args));
  const send = (body, type = "application/json") => collector.fetch(new Request("https://www.kickoffmiles.com/api/csp-report", { method: "POST", headers: { "Content-Type": type }, body }));
  assert.equal((await collector.fetch(new Request("https://www.kickoffmiles.com/api/csp-report"))).status, 405);
  assert.equal((await send("bad", "text/plain")).status, 415);
  assert.equal((await send("invalid json")).status, 400);
  assert.equal((await send("x".repeat(17000))).status, 413);
  assert.equal((await send(JSON.stringify({ "csp-report": { "document-uri": "https://other.example/" } }))).status, 204);
  assert.deepEqual(logs, []);
});
