import "./Background.css";
import roadtripVideo from "../../Videos/Roadtrip.mp4.mov";

export default function Background({ team }) {
  const primaryColor = team?.color || "#111827";
  const logo = team?.logos?.[0] || "";

  // Once a team/game is selected, completely replace the road video.
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

  // Default background before a football team/game is selected.
  return (
    <div className="bg-video">
      <video autoPlay muted loop playsInline preload="auto">
        <source src={roadtripVideo} type="video/mp4" />
      </video>

      <div className="bg-video-overlay" />
    </div>
  );
}