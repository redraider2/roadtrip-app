import "./Background.css";

export default function Background({ team }) {
  const primaryColor = team?.color || "#111827";
  const logo = team?.logos?.[0] || "";
  const defaultBackground =
    `${import.meta.env.BASE_URL}college-football-roadtrip-bg.png`;

  if (team) {
    return (
      <div
        className="team-background"
        style={{
          background: `
            radial-gradient(
              circle at 75% 30%,
              ${primaryColor} 0%,
              ${primaryColor} 22%,
              #111111 75%
            )
          `,
        }}
      >
        {logo ? (
          <img
            className="team-background-logo"
            src={logo}
            alt=""
            aria-hidden="true"
          />
        ) : null}

        <div className="team-background-name">
          {team.school}
        </div>

        <div className="team-background-overlay" />
      </div>
    );
  }

  return (
    <div
      className="default-roadtrip-background"
      style={{
        backgroundImage: `url("${defaultBackground}")`,
      }}
    >
      <div className="default-roadtrip-overlay" />
    </div>
  );
}
