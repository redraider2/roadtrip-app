import { useEffect, useRef } from "react";
import { recordPartnerEvent } from "../lib/partnerMetrics.js";

const PARTNER_LABELS = {
  featured: "Featured Partner",
  sponsored: "Sponsored",
  offer: "Kickoff Miles Offer",
  destination: "Destination Partner",
};

function contextualCopy(partner, contextLabel) {
  const copy = partner?.contextCopy;
  if (!copy || typeof copy !== "object") return partner?.description || "";
  return copy[contextLabel] || copy.default || partner?.description || "";
}

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
    : partner.isDemo
      ? "Founding Partner Preview"
      : PARTNER_LABELS[type] || PARTNER_LABELS.featured;
  const description = contextualCopy(partner, contextLabel);
  const monogram = String(partner.businessName || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

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
      className={`partner-placement is-${type}${partner.isDemo ? " is-demo" : ""}`}
      aria-label={`${placementLabel}: ${partner.businessName}`}
    >
      <div className="partner-placement-label-row">
        <span>{placementLabel}</span>
        {contextLabel ? <small>{contextLabel}</small> : null}
      </div>

      <div className="partner-placement-content">
        <div className="partner-placement-identity">
          {partner.imageUrl ? (
            <img
              className="partner-placement-logo"
              src={partner.imageUrl}
              alt=""
            />
          ) : (
            <span className="partner-placement-monogram" aria-hidden="true">
              {monogram || "KM"}
            </span>
          )}
          <div>
            <h3>{partner.businessName}</h3>
            {partner.tagline ? (
              <p className="partner-placement-tagline">{partner.tagline}</p>
            ) : null}
            {partner.locationText ? <p>{partner.locationText}</p> : null}
            {description ? <p>{description}</p> : null}
          </div>
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
              {partner.websiteLabel || partner.ctaLabel || "Visit website"}
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
