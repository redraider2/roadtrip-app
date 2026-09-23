import PartnerPlacement from "./PartnerPlacement.jsx";
import { DestinationPartnerCard } from "./DestinationPartnerDiscovery.jsx";
import { getDestinationPartners } from "../lib/destinationPartners.js";

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
  comingSoon = false,
  venueId,
  placement,
  onSave,
  isSaved,
}) {
  const realPartners = partners.filter(Boolean);
  const discoveryPartners =
    venueId && placement ? getDestinationPartners(venueId, placement) : [];
  const occupiedCount = discoveryPartners.length + realPartners.length;
  const positionCount = Math.max(minimumPositions, occupiedCount);
  const availableCount = Math.max(0, positionCount - occupiedCount);

  if (comingSoon) {
    return (
      <section className="destination-partner-marketplace is-coming-soon" aria-label="Local partners coming soon">
        <div className="destination-partner-marketplace-heading">
          <div>
            <span className="section-kicker">LOCAL PARTNERS</span>
            <h3>Destination Partner Network — Coming Soon</h3>
            <p className="section-copy">
              Kickoff Miles is building the local partner network for this destination.
            </p>
          </div>
          <span className="destination-partner-count">COMING SOON</span>
        </div>
      </section>
    );
  }

  return (
    <section className="destination-partner-marketplace" aria-label="Local partners">
      <div className="destination-partner-marketplace-heading">
        <div>
          <span className="section-kicker">{salesPreview ? "FOUNDING LOCAL PARTNERS" : "LOCAL PARTNERS"}</span>
          <h3>{salesPreview ? "Limited Destination Partner Network" : "Destination Partner Network"}</h3>
        </div>
        {salesPreview ? (
          <span className="destination-partner-count">
            {occupiedCount} of {positionCount} founding partner positions filled
          </span>
        ) : null}
      </div>

      <div className="destination-partner-rail">
        {discoveryPartners.map((partner) => (
          <DestinationPartnerCard
            compact
            key={partner.id}
            partner={partner}
            placement={placement}
            onSave={onSave}
            saved={isSaved?.(partner)}
          />
        ))}
        {realPartners.map((partner, index) => (
          <PartnerPlacement
            compact
            contextLabel={contextLabel}
            key={partner.id || `${partner.businessName}-${index}`}
            partner={partner}
            type="destination"
          />
        ))}
        {Array.from({ length: availableCount }, (_, index) => {
          const partner = availablePosition(index);
          return (
            <PartnerPlacement
              compact
              contextLabel={contextLabel}
              key={partner.id}
              partner={partner}
              type="destination"
            />
          );
        })}
      </div>
    </section>
  );
}
