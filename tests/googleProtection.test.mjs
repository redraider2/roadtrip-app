import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createGoogleProtection,
  coordinateKey,
  isGoogleBudgetExceeded,
  normalizeTextKey,
} = require("../backend/src/googleProtection");

test("Google cache coalesces concurrent loads and reuses successful values", async () => {
  const protection = createGoogleProtection({ maxUpstreamPerMinute: 10 });
  let loads = 0;

  const loader = async () => {
    loads += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { ok: true };
  };

  const [first, second, third] = await Promise.all([
    protection.loadCached("same", 1000, loader),
    protection.loadCached("same", 1000, loader),
    protection.loadCached("same", 1000, loader),
  ]);

  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
  assert.equal(loads, 1);

  const fourth = await protection.loadCached("same", 1000, loader);
  assert.deepEqual(fourth, first);
  assert.equal(loads, 1);
});

test("Google upstream budget rejects calls after the configured ceiling", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true });

  try {
    const protection = createGoogleProtection({ maxUpstreamPerMinute: 2 });
    await protection.fetchGoogle("https://example.test/one");
    await protection.fetchGoogle("https://example.test/two");

    await assert.rejects(
      () => protection.fetchGoogle("https://example.test/three"),
      (err) => isGoogleBudgetExceeded(err)
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("Google cache keys normalize text and route coordinates", () => {
  assert.equal(normalizeTextKey("  Lubbock   TX "), "lubbock tx");
  assert.equal(
    coordinateKey({ latitude: 33.58427, longitude: -101.87831 }, 3),
    "33.584,-101.878"
  );
});
