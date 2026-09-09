import { JOURNEY_SCREENS } from "../screens/journeyArchitecture.js";

export default function JourneyNavigation({ activeScreen, canAccess, onNavigate }) {
  return (
    <nav className="journey-navigation" aria-label="Kickoff Miles journey">
      {JOURNEY_SCREENS.map((screen) => {
        const disabled = screen.status === "reserved-boundary" || !canAccess(screen.id);

        return (
          <button
            key={screen.id}
            type="button"
            className={`journey-navigation-item${
              activeScreen === screen.id ? " is-active" : ""
            }`}
            aria-current={activeScreen === screen.id ? "page" : undefined}
            disabled={disabled}
            onClick={() => onNavigate(screen.id)}
          >
            {screen.label}
          </button>
        );
      })}
    </nav>
  );
}
