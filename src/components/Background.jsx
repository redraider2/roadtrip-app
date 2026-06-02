import "./Background.css";
import roadtripVideo from "../../Videos/Roadtrip.mp4.mov";

export default function Background() {
  return (
    <div className="bg-video">
      <video autoPlay muted loop playsInline preload="auto">
        <source src={roadtripVideo} type="video/mp4" />
      </video>
    </div>
  );
}
