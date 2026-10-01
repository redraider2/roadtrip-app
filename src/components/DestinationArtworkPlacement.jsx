import { useEffect, useRef } from "react";
import { selectDestinationArtwork } from "../lib/destinationArtworkCampaigns.js";
import { recordPartnerEvent } from "../lib/partnerMetrics.js";
import "./DestinationArtworkPlacement.css";

function ArtworkLink({ campaign, venueId, placement, selection }) {
  const linkRef = useRef(null);
  const { creativeId, creative, href } = selection;

  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!active || !entry.isIntersecting || entry.intersectionRatio < 0.25) return;
      recordPartnerEvent({
        partner: campaign, placement, creative: creativeId, action: "impression",
        campaignId: campaign.id, destinationId: String(venueId),
      });
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(linkRef.current);
    return () => { active = false; observer.disconnect(); };
  }, [campaign, venueId, placement, creativeId]);

  const content = campaign.placementContent[placement];
  const track = (action) => recordPartnerEvent({
    partner: campaign, placement, creative: creativeId, action,
    campaignId: campaign.id, destinationId: String(venueId),
  });
  const actionLabel = (action) => action === "directions" ? "Get Directions" : "View Menu";

  return (
    <aside ref={linkRef} className="destination-artwork-placement" aria-label="Sponsored: Culinary Gangster"
      data-campaign-id={campaign.id} data-destination-id={String(venueId)}
      data-placement={placement} data-creative={creativeId}>
      {content.heading ? <h2 className="destination-artwork-context">{content.heading}</h2> : null}
      <div className="destination-artwork-layout">
        <a className="destination-artwork-image" href={href} target="_blank" rel="noopener noreferrer"
          aria-label={creative.linkLabel} onClick={() => track(creative.action)}>
          <img src={`${import.meta.env.BASE_URL}${creative.imageUrl}`} alt={creative.alt}
            width={creative.width} height={creative.height} loading="lazy" />
        </a>
        <div className="destination-artwork-copy">
          <span className="destination-artwork-disclosure">Sponsored · Tempe</span>
          <h3>Culinary Gangster</h3>
          <p>{content.sentence}</p>
          <p>{campaign.displayAddress}</p>
          <div className="destination-artwork-actions">
            {content.actions.map((action, index) => (
              <a key={action} className={index === 0 ? "is-primary" : "is-secondary"}
                href={campaign.links[action]} target="_blank" rel="noopener noreferrer"
                aria-label={`${actionLabel(action)} — Culinary Gangster Tempe (opens in a new tab)`}
                onClick={() => track(action)}>{actionLabel(action)}</a>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function DestinationArtworkPlacement({ campaign, venueId, placement, fallback = null }) {
  const selection = selectDestinationArtwork(campaign, venueId, placement);
  if (!selection) return fallback;
  return <ArtworkLink key={`${campaign.id}:${venueId}:${placement}:${selection.creativeId}`} campaign={campaign} venueId={venueId} placement={placement} selection={selection} />;
}
