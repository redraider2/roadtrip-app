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
  if (!partner) return null;

  return (
    <aside
      className={`partner-placement is-${type}`}
      aria-label={`${PARTNER_LABELS[type] || PARTNER_LABELS.featured}: ${partner.businessName}`}
    >
      <div className="partner-placement-label-row">
        <span>{PARTNER_LABELS[type] || PARTNER_LABELS.featured}</span>
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
            <a href={partner.directionsUrl} target="_blank" rel="noreferrer">
              Directions
            </a>
          ) : null}
          {partner.websiteUrl ? (
            <a href={partner.websiteUrl} target="_blank" rel="noreferrer">
              Visit website
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
