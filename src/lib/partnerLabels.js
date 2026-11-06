// Paid recognition requires an explicit commercial designation; editorial and
// complimentary recommendations never inherit it from placement alone.
export const PAID_PARTNER_LABEL = "Kickoff Miles Super Pick · Sponsored Partner";
export function isPaidPartner(partner) {
  return Boolean(partner && !partner.isEditorial && !partner.isHouseAd && !partner.isDemo
    && (partner.isPaidPartner === true || partner.partnershipType === "paid"));
}
export function partnerDisclosure(partner, fallback) {
  return isPaidPartner(partner) ? PAID_PARTNER_LABEL : fallback;
}
