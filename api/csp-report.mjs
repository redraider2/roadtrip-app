const MAX_BYTES = 16384;
const headers = { "Cache-Control": "no-store" };

function safeOrigin(value) {
  try { return new URL(value).origin; }
  catch { return ["inline", "eval", "self", "data", "blob"].includes(value) ? value : "unknown"; }
}

function sanitize(report) {
  const body = report?.["csp-report"] || (report?.type === "csp-violation" ? report.body : null);
  if (!body) return null;
  const documentOrigin = safeOrigin(body["document-uri"] || body.documentURL);
  if (!["https://www.kickoffmiles.com", "https://kickoffmiles.com"].includes(documentOrigin)) return null;
  // Never retain query strings, fragments, script samples, referrers, IPs,
  // user agents, or arbitrary report payloads in application logs.
  return {
    documentOrigin,
    directive: String(body["effective-directive"] || body.effectiveDirective || "unknown").replace(/[^a-z-]/gi, "").slice(0, 80),
    blockedOrigin: safeOrigin(body["blocked-uri"] || body.blockedURL),
    disposition: body.disposition === "enforce" ? "enforce" : "report",
  };
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
    const type = request.headers.get("content-type")?.split(";")[0].trim();
    if (!["application/csp-report", "application/reports+json", "application/json"].includes(type)) {
      return new Response(null, { status: 415, headers });
    }
    if (Number(request.headers.get("content-length")) > MAX_BYTES) return new Response(null, { status: 413, headers });
    let payload;
    try {
      const reader = request.body?.getReader();
      const chunks = [];
      let size = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) {
            await reader.cancel();
            return new Response(null, { status: 413, headers });
          }
          chunks.push(value);
        }
      }
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch { return new Response(null, { status: 400, headers }); }
    const reports = (Array.isArray(payload) ? payload : [payload]).slice(0, 20).map(sanitize).filter(Boolean);
    if (reports.length) console.info("csp-violation", JSON.stringify(reports));
    return new Response(null, { status: 204, headers });
  },
};
