export default function RoadSign({ label, title, subtitle, meta, compact = false }) {
  return (
    <div className={`road-sign${compact ? " is-compact" : ""}`}>
      {label ? <span className="road-sign-exit">{label} <span aria-hidden="true">↗</span></span> : null}
      <span className="road-sign-meta">{meta || "Kickoff Miles"}</span>
      <strong className="road-sign-title">{title}</strong>
      <span className="road-sign-bottom">
        <span>{subtitle}</span>
        <span className="road-sign-arrow" aria-hidden="true">↗</span>
      </span>
    </div>
  );
}
