const STORAGE_KEY = "kickoff_miles_partner_events";
const MAX_EVENTS = 500;

function readEvents() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordPartnerEvent({
  partner,
  eventType,
  contextLabel,
  placementType,
}) {
  if (!partner?.id || !eventType) return;

  try {
    const events = readEvents();
    events.push({
      partnerId: partner.id,
      businessName: partner.businessName || "",
      venueId: partner.venueId || null,
      gameId: partner.gameId || null,
      eventType,
      contextLabel: contextLabel || "",
      placementType: placementType || "featured",
      occurredAt: new Date().toISOString(),
    });

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS))
    );
  } catch {
    // Measurement must never interrupt the traveler experience.
  }
}

export function getPartnerEvents() {
  return readEvents();
}
