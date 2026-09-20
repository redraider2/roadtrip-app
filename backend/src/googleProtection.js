class GoogleBudgetExceededError extends Error {
  constructor(limit) {
    super(`Google upstream request budget exceeded (${limit}/minute)`);
    this.name = "GoogleBudgetExceededError";
    this.code = "GOOGLE_UPSTREAM_BUDGET_EXCEEDED";
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createGoogleProtection({
  maxUpstreamPerMinute = positiveInteger(
    process.env.GOOGLE_UPSTREAM_MAX_PER_MINUTE,
    180
  ),
} = {}) {
  const cache = new Map();
  const inflight = new Map();
  let budgetWindowStartedAt = Date.now();
  let upstreamRequestsThisWindow = 0;

  function resetBudgetIfNeeded(now = Date.now()) {
    if (now - budgetWindowStartedAt >= 60 * 1000) {
      budgetWindowStartedAt = now;
      upstreamRequestsThisWindow = 0;
    }
  }

  function reserveUpstreamRequest() {
    resetBudgetIfNeeded();

    if (upstreamRequestsThisWindow >= maxUpstreamPerMinute) {
      throw new GoogleBudgetExceededError(maxUpstreamPerMinute);
    }

    upstreamRequestsThisWindow += 1;
  }

  async function fetchGoogle(url, options) {
    reserveUpstreamRequest();
    return fetch(url, options);
  }

  async function loadCached(
    key,
    ttlMs,
    loader,
    { staleMs = Math.max(ttlMs, 24 * 60 * 60 * 1000) } = {}
  ) {
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (inflight.has(key)) {
      return inflight.get(key);
    }

    const pending = Promise.resolve()
      .then(loader)
      .then((value) => {
        const cachedAt = Date.now();
        cache.set(key, {
          value,
          expiresAt: cachedAt + ttlMs,
          staleUntil: cachedAt + staleMs,
        });
        return value;
      })
      .catch((err) => {
        const stale = cache.get(key);
        if (stale && stale.staleUntil > Date.now()) {
          console.warn(
            `Using stale Google cache entry for ${key} after upstream failure:`,
            err.message
          );
          return stale.value;
        }
        throw err;
      })
      .finally(() => {
        inflight.delete(key);
      });

    inflight.set(key, pending);
    return pending;
  }

  function status() {
    resetBudgetIfNeeded();
    return {
      maxUpstreamPerMinute,
      upstreamRequestsThisWindow,
      cachedEntries: cache.size,
      inflightEntries: inflight.size,
    };
  }

  return {
    fetchGoogle,
    loadCached,
    status,
  };
}

function normalizeTextKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function coordinateKey(point, precision = 4) {
  const latitude = Number(point?.latitude);
  const longitude = Number(point?.longitude);
  return `${latitude.toFixed(precision)},${longitude.toFixed(precision)}`;
}

function isGoogleBudgetExceeded(err) {
  return err?.code === "GOOGLE_UPSTREAM_BUDGET_EXCEEDED";
}

module.exports = {
  createGoogleProtection,
  coordinateKey,
  isGoogleBudgetExceeded,
  normalizeTextKey,
};
