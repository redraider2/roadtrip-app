import { useState } from "react";
import { getStadiumProfile, stadiumHeroCopy } from "../lib/stadiumIdentity.js";
import RoadSign from "./RoadSign.jsx";
import "./StadiumIdentity.css";

export default function StadiumIdentity({ venueId, screen, headingId, primary = false }) {
  const profile = getStadiumProfile(venueId);
  if (!profile) return null;
  return <DestinationIdentity key={profile.venueId} profile={profile} screen={screen} headingId={headingId} primary={primary} />;
}

function DestinationIdentity({ profile, screen, headingId, primary }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const copy = stadiumHeroCopy(profile, screen);
  const Heading = primary ? "h1" : "h2";
  return (
    <figure className="stadium-identity" data-stadium-id={profile.venueId}>
      <div className={`stadium-identity-hero${photoFailed ? " has-photo-fallback" : ""}`}>
        {!photoFailed ? <img
          className="stadium-identity-photo"
          src={`${import.meta.env.BASE_URL}${profile.photo.path}`}
          width={profile.photo.width}
          height={profile.photo.height}
          alt={profile.photo.alt}
          onError={() => setPhotoFailed(true)}
          fetchPriority="high"
        /> : null}
        <div className="stadium-identity-copy">
          <span className="stadium-identity-eyebrow">{copy.eyebrow}</span>
          <Heading id={headingId}>{copy.title}</Heading>
          <p>{copy.description}</p>
        </div>
        <RoadSign label={copy.signLabel} meta={`${profile.city}, ${profile.state}`} title={profile.stadium} subtitle={`${profile.school} University`} />
      </div>
      {!photoFailed ? <figcaption className="stadium-photo-credit">
        Photo: <a href={profile.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{profile.photo.creator}</a>
        {", "}<a href={profile.photo.licenseUrl} target="_blank" rel="noopener noreferrer">{profile.photo.license}</a>
        {`, via ${profile.photo.source}. `}
        <a href={profile.photo.sourceUrl} target="_blank" rel="noopener noreferrer">{profile.photo.originalTitle}</a>.
        <span>Photographed {profile.photo.dateLabel}. Display changes: {profile.photo.changes}</span>
      </figcaption> : <figcaption className="stadium-photo-credit">Stadium photo unavailable. {profile.stadium} · {profile.city}, {profile.state}.</figcaption>}
    </figure>
  );
}
