import { getNashvilleRecommendations, visitMusicCity } from "../lib/nashvilleRecommendations.js";
import PartnerPlacement from "./PartnerPlacement.jsx";
import "./NashvilleRecommendations.css";

export default function NashvilleRecommendations({ venueId, placement, featured = false }) {
  const content = getNashvilleRecommendations(venueId, placement);
  if (!content) return null;
  return (
    <section className="nashville-guide" aria-label={content.title} data-nashville-placement={placement}>
      {featured ? <PartnerPlacement partner={visitMusicCity} contextLabel="Nashville / Vanderbilt" /> : null}
      {content.categories.length ? <>
        <span className="section-kicker">EXPLORE NASHVILLE</span>
        <h2>{content.title}</h2>
        <div className="nashville-guide-grid">
          {content.categories.map((category) => <article key={category.id} data-nashville-category={category.id}>
            <h3>{category.title}</h3>
            <ul>{category.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>)}
        </div>
        <a className="nashville-guide-link" href={visitMusicCity.websiteUrl} target="_blank" rel="noopener noreferrer">Plan your visit at VisitMusicCity.com ↗</a>
      </> : null}
    </section>
  );
}
