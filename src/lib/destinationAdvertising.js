function normalizeVenueId(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function partnerMatchesDestination(partner, venueId) {
  if (!partner) return false;

  const destinationVenueId = normalizeVenueId(venueId);
  if (!destinationVenueId) return false;

  const eligibleVenueIds = Array.isArray(partner.destinationVenueIds)
    ? partner.destinationVenueIds.map(normalizeVenueId).filter(Boolean)
    : partner.venueId !== undefined && partner.venueId !== null
      ? [normalizeVenueId(partner.venueId)].filter(Boolean)
      : [];

  return eligibleVenueIds.includes(destinationVenueId);
}

export function selectDestinationDemoPartner({
  demoKey,
  partners,
  venueId,
}) {
  if (!demoKey || !partners) return null;

  const partner = partners[demoKey] || null;

  return partnerMatchesDestination(partner, venueId) ? partner : null;
}
