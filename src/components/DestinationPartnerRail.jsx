import PartnerPlacement from "./PartnerPlacement.jsx";

function availablePosition(index) {
  return {
    id: `available-destination-partner-${index + 1}`,
    businessName: "Available Partner Position",
    category: "local partner",
    locationText: "Limited destination inventory",
    description:
      "A reserved position for a local business serving visiting college football fans.",
    websiteUrl:
      "mailto:support@kickoffmiles.com?subject=Kickoff%20Miles%20Destination%20Partner",
    websiteLabel: "Become a Partner",
    isHouseAd: true,
  };
}

export default function DestinationPartnerRail({
  contextLabel,
  partners = [],
  minimumPositions = 5,
  salesPreview = false,
}) {
  const realPartners = partners.filter(Boolean);
  const positions = Array.from(
    { length: Math.max(minimumPositions, realPartners.length) },
    (_, index) => realPartners[index] || availablePosition(index)
  );

  return (
    <section className="destination-partner-marketplace" aria-label="Local partners">
      <div className="destination-partner-marketplace-heading">
        <div>
          <span className="section-kicker">{salesPreview ? "FOUNDING LOCAL PARTNERS" : "LOCAL PARTNERS"}</span>
          <h3>{salesPreview ? "Limited Destination Partner Network" : "Destination Partner Network"}</h3>
        </div>
        {salesPreview ? (
          <span className="destination-partner-count">
            {realPartners.length} of {positions.length} founding partner positions filled
          </span>
        ) : null}
      </div>

      <div className="destination-partner-rail">
        {positions.map((partner, index) => (
          <PartnerPlacement
            compact
            contextLabel={contextLabel}
            key={partner.id || `${partner.businessName}-${index}`}
            partner={partner}
            type="destination"
          />
        ))}
      </div>
    </section>
  );
}
