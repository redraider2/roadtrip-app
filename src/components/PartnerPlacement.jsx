import { useEffect, useRef } from "react";
import { recordPartnerEvent } from "../lib/partnerMetrics.js";

const PARTNER_LABELS = {
  featured: "Featured Partner",
  sponsored: "Sponsored",
  offer: "Kickoff Miles Offer",
  destination: "Destination Partner",
};

export default function PartnerPlacement({
  contextLabel,
  partner,
  type = "featured",
}) {
  const impressionKeyRef = useRef("");

  useEffect(() => {
    if (!partner?.id) return;

    const impressionKey = `${partner.id}:${type}:${contextLabel || ""}`;
    if (impressionKeyRef.current === impressionKey) return;
    impressionKeyRef.current = impressionKey;

    recordPartnerEvent({
      partner,
      eventType: "impression",
      contextLabel,
      placementType: type,
    });
  }, [contextLabel, partner, type]);

  if (!partner) return null;

  const placementLabel = partner.isHouseAd
    ? "Advertising Opportunity"
    : PARTNER_LABELS[type] || PARTNER_LABELS.featured;

  const recordAction = (eventType) => {
    recordPartnerEvent({
      partner,
      eventType,
      contextLabel,
      placementType: type,
    });
  };

  return (
    <aside
      className={`partner-placement is-${type}`}
      aria-label={`${placementLabel}: ${partner.businessName}`}
    >
      <div className="partner-placement-label-row">
        <span>{placementLabel}</span>
        {contextLabel ? <small>{contextLabel}</small> : null}
      </div>

      <div className="partner-placement-content">
        <div>
          <h3>{partner.businessName}</h3>
          {partner.locationText ? <p>{partner.locationText}</p> : null}
          {partner.description ? <p>{partner.description}</p> : null}
          {partner.offerText ? (
            <strong className="partner-placement-offer">
              Kickoff Miles Offer · {partner.offerText}
            </strong>
          ) : null}
        </div>

        <div className="partner-placement-actions">
          {partner.directionsUrl ? (
            <a
              href={partner.directionsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordAction("directions_click")}
            >
              Directions
            </a>
          ) : null}
          {partner.websiteUrl ? (
            <a
              href={partner.websiteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordAction("website_click")}
            >
              {partner.websiteLabel || "Visit website"}
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
