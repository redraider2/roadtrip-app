import { useMemo, useState } from "react";
import { getPartnerEvents } from "../lib/partnerMetrics.js";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadEvents(events) {
  const headers = [
    "occurredAt",
    "businessName",
    "partnerId",
    "venueId",
    "gameId",
    "eventType",
    "placementType",
    "contextLabel",
  ];
  const rows = events.map((event) =>
    headers.map((header) => csvCell(event[header])).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kickoff-miles-partner-field-test-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function PartnerFieldTestReport({ partner, venueId }) {
  const [events, setEvents] = useState(() => getPartnerEvents());

  const scopedEvents = useMemo(() => {
    if (partner?.id) {
      return events.filter((event) => String(event.partnerId) === String(partner.id));
    }
    if (venueId) {
      return events.filter((event) => String(event.venueId) === String(venueId));
    }
    return events;
  }, [events, partner?.id, venueId]);

  const counts = useMemo(() => {
    return scopedEvents.reduce(
      (summary, event) => {
        if (event.eventType === "impression") summary.impressions += 1;
        if (event.eventType === "directions_click") summary.directions += 1;
        if (event.eventType === "website_click") summary.website += 1;
        return summary;
      },
      { impressions: 0, directions: 0, website: 0 }
    );
  }, [scopedEvents]);

  const businessName =
    partner?.businessName ||
    [...scopedEvents].reverse().find((event) => event.businessName)?.businessName ||
    "Destination partner";

  return (
    <section className="panel" aria-labelledby="field-test-metrics-title">
      <div className="section-heading-row">
        <div>
          <span className="section-kicker">LUBBOCK FIELD TEST · INTERNAL</span>
          <h2 id="field-test-metrics-title" className="panel-title">
            Partner Performance Proof
          </h2>
          <p className="section-copy">
            Local field-test measurements for {businessName}. These counts stay on this browser and are not production analytics yet.
          </p>
        </div>
      </div>

      <div className="trip-stat-grid" aria-label="Partner field test metrics">
        <div className="trip-stat">
          <span className="trip-stat-label">Placements Shown</span>
          <strong className="trip-stat-value">{counts.impressions}</strong>
        </div>
        <div className="trip-stat">
          <span className="trip-stat-label">Directions Clicks</span>
          <strong className="trip-stat-value">{counts.directions}</strong>
        </div>
        <div className="trip-stat">
          <span className="trip-stat-label">Website Clicks</span>
          <strong className="trip-stat-value">{counts.website}</strong>
        </div>
      </div>

      <div className="recommendation-actions">
        <button type="button" className="ghost-button" onClick={() => setEvents(getPartnerEvents())}>
          Refresh Metrics
        </button>
        <button
          type="button"
          className="ghost-button"
          disabled={scopedEvents.length === 0}
          onClick={() => downloadEvents(scopedEvents)}
        >
          Export Field Test CSV
        </button>
      </div>
    </section>
  );
}
