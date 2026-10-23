import { getStadiumProfile, stadiumFeatureCopy } from "../lib/stadiumProfiles.js";

export default function StadiumFeature({ venueId, variant = "plan" }) {
  const profile = getStadiumProfile(venueId);
  if (!profile) return null;
  const copy = stadiumFeatureCopy(profile, variant);
  const { photo } = profile;
  const date = photo.date ? new Date(photo.date).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }) : null;

  return (
    <figure
      className={`route-stadium-feature${profile.venueId === "3784" ? "" : " is-national-stadium"}`}
      aria-label={`${profile.stadium} destination photograph`}
      data-stadium-venue-id={profile.venueId}
    >
      <div className="route-stadium-photo">
        <img
          src={`${import.meta.env.BASE_URL}${photo.path}`}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          decoding="async"
        />
        <div className="route-stadium-heading">
          <span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.intro}</p>
        </div>
        <div className="route-stadium-sign">
          <span>{copy.sign}</span><strong>{profile.stadium}</strong>
          <small>{profile.school} · {profile.city}, {profile.state}</small>
        </div>
      </div>
      <figcaption>
        Photo: <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.creator}</a>
        {" · "}{photo.licenseUrl
          ? <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a>
          : <span>{photo.license}</span>}
        {` · via ${photo.source}. `}{date ? `Photographed ${date}. ` : ""}{photo.changes}
      </figcaption>
    </figure>
  );
}
