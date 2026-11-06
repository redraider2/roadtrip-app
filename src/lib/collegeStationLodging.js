// Destination-only category policy, separate from the four artwork placements.
import { PAID_PARTNER_LABEL } from "./partnerLabels.js";
export const SPONSORED_HOTEL_LABEL = PAID_PARTNER_LABEL;
export const isCollegeStation = venueId => String(venueId ?? "").trim() === "3795";
const contexts = new Set(["Trip HQ", "Along the Way", "Game Weekend", "Game Day"]);

export function isHotelRecommendation(partner) {
  return /hotel|lodging|stay|accommodation/i.test(partner?.category || partner?.locationText || "");
}

export function filterHotelCards(partners, venueId, context) {
  return isCollegeStation(venueId) && contexts.has(context)
    ? partners.filter(partner => !isHotelRecommendation(partner))
    : partners;
}

function isSponsor(place) {
  const name = String(place.name || "").toLowerCase().replace(/&|\band\b/g, "").replace(/[^a-z0-9]/g, "");
  return name.startsWith("texasamhotel")
    || /^(www\.)?texasamhotelcc\.com$/i.test((() => {
      try { return new URL(place.website).hostname; } catch { return ""; }
    })());
}

export function getWeekendHotels(hotels, venueId) {
  if (!isCollegeStation(venueId)) return hotels;
  const existing = hotels.find(isSponsor);
  return [{
    ...existing,
    id: existing?.id || "texas-am-hotel-sponsored",
    name: "Texas A&M Hotel & Conference Center",
    address: existing?.address || "177 Joe Routt Boulevard, College Station, TX 77843",
    website: "https://www.texasamhotelcc.com/",
    sponsorshipLabel: SPONSORED_HOTEL_LABEL,
  }, ...hotels.filter(place => !isSponsor(place)).slice(0, 2)];
}
