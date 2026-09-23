import { useEffect, useRef, useState } from "react";
import { getDestinationPartners, partnerDirectionsUrl } from "../lib/destinationPartners.js";
import { recordPartnerEvent } from "../lib/partnerMetrics.js";

const ACTION_LABELS = { view_events: "VIEW EVENTS", directions: "DIRECTIONS", save_to_trip: "SAVE TO TRIP" };

export function DestinationPartnerCard({ partner, placement, onSave, saved = false }) {
  const config = partner.placements[placement];
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { creative } = config;

  useEffect(() => {
    const element = cardRef.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      recordPartnerEvent({ partner, placement, creative, action: "impression" });
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [partner, placement, creative]);

  const track = (action) => recordPartnerEvent({ partner, placement, creative, action });
  async function save() {
    if (saving || saved) return;
    track("save_to_trip");
    setSaving(true);
    setError("");
    try { await onSave(partner); }
    catch { setError("Could not save this stop. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <aside ref={cardRef} className={`destination-discovery-card is-${creative}`} aria-label={partner.name} data-partner-id={partner.id} data-placement={placement}>
      <img src={`${import.meta.env.BASE_URL}${partner.imageUrl}`} alt={partner.imageAlt} loading="lazy" />
      <div className="destination-discovery-content">
        {creative === "featured" ? <span className="section-kicker">FEATURED IN {partner.marketName.toUpperCase()}</span> : null}
        <h3>{partner.businessName}</h3>
        {creative === "featured" ? <><p className="destination-discovery-headline">{partner.headline}</p><p>{partner.description}</p></> : <p>{partner.summary}</p>}
        <p className="destination-discovery-address">{partner.displayAddress}</p>
        <div className="destination-discovery-actions">
          {config.actions.map((action) => action === "save_to_trip" ? (
            <button type="button" key={action} disabled={!onSave || saving || saved} onClick={save}>
              {saved ? "✓ SAVED TO TRIP" : saving ? "SAVING…" : ACTION_LABELS[action]}
            </button>
          ) : (
            <a key={action} href={action === "view_events" ? partner.eventsUrl : partnerDirectionsUrl(partner)} target="_blank" rel="noopener noreferrer" onClick={() => track(action)}>{ACTION_LABELS[action]}</a>
          ))}
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </aside>
  );
}

export default function DestinationPartnerDiscovery({ venueId, placement, onSave, isSaved }) {
  return getDestinationPartners(venueId, placement).map((partner) => (
    <section className="destination-discovery" key={partner.id} aria-label={partner.placements[placement].heading || `Featured in ${partner.marketName}`}>
      {partner.placements[placement].heading ? <h2>{partner.placements[placement].heading}</h2> : null}
      <DestinationPartnerCard partner={partner} placement={placement} onSave={onSave} saved={isSaved?.(partner)} />
    </section>
  ));
}
