import "./Background.css";
import roadtripVideo from "../assets/Roadtrip.mp4";

export default function Background() {
  return (
    <div className="bg-video">
      <video autoPlay muted loop playsInline preload="auto">
        <source src={roadtripVideo} type="video/mp4" />
      </video>
    </div>
  );
}