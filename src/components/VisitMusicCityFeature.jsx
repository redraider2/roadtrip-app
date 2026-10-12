import "./VisitMusicCityFeature.css";

function NashvilleIllustration() {
  return <svg className="music-city-skyline" viewBox="0 0 460 350" fill="none" aria-hidden="true">
    <circle cx="278" cy="118" r="84" fill="url(#nashville-sunset)" />
    <path d="M0 235C110 191 234 268 460 212V350H0Z" fill="#192E2D" />
    <g stroke="#EACB87" strokeWidth="2" strokeLinejoin="round">
      <path d="M70 235V171H105V235M78 183H97M78 195H97M78 207H97" />
      <path d="M119 235V137H158V235M127 151H150M127 163H150M127 175H150M127 187H150" />
      <path d="M182 235V112H187V58L199 86H228L240 58V112H246V235M192 119H236M192 132H236M192 145H236M192 158H236M192 171H236M192 184H236M206 96H221" fill="#142628" />
      <path d="M261 235V152H298V235M270 165H289M270 180H289M270 195H289" />
      <path d="M309 235V127H347V235M318 140H338M318 154H338M318 168H338M318 182H338M318 196H338" />
      <path d="M353 235V176H384V235M362 187H376M362 201H376" />
      <path d="M30 260H426M42 257Q223 181 414 257M53 263V277M83 252V277M113 241V277M143 232V277M173 228V277M203 226V277M233 226V277M263 230V277M293 236V277M323 245V277M353 257V277M384 266V277" opacity=".55" />
    </g>
    <path d="M0 291C128 269 298 317 460 289M0 308C172 281 297 338 460 311" stroke="#D4AD68" strokeOpacity=".18" strokeWidth="2" />
    <g fill="#F6DB9C"><circle cx="67" cy="98" r="2"/><circle cx="363" cy="70" r="2"/><circle cx="398" cy="139" r="2"/></g>
    <defs><linearGradient id="nashville-sunset" x1="278" y1="34" x2="278" y2="202" gradientUnits="userSpaceOnUse"><stop stopColor="#EEC879"/><stop offset="1" stopColor="#BC794B"/></linearGradient></defs>
  </svg>;
}

export default function VisitMusicCityFeature({ partner, contextLabel }) {
  return <aside className="music-city-feature" aria-label="Nashville Visitor Guide: VisitMusicCity.com"
    data-recommendation-id={partner.id} data-visit-music-city-feature>
    <div className="music-city-feature-copy">
      <div className="music-city-feature-eyebrow"><span>NASHVILLE, TENNESSEE</span>{contextLabel ? <span>{contextLabel}</span> : null}</div>
      <h3>VisitMusicCity.com</h3>
      <p className="music-city-feature-headline">Come for the Commodores.<br/><em>Stay for Music City.</em></p>
      <p className="music-city-feature-description">Hot chicken. Legendary stages. A weekend worth staying for. Make Nashville part of your Vanderbilt game plan.</p>
      <div className="music-city-feature-footer">
        <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer">Explore Music City <span aria-hidden="true">↗</span></a>
        <span className="music-city-feature-note">Your Nashville weekend starts here.</span>
      </div>
    </div>
    <div className="music-city-feature-art">
      <span className="music-city-feature-art-kicker">FIND YOUR RHYTHM</span>
      <NashvilleIllustration />
      <div className="music-city-feature-art-caption"><strong>NASHVILLE</strong><span>FOOD · MUSIC · GAME DAY</span></div>
    </div>
  </aside>;
}
