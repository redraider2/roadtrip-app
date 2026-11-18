import { PUBLIC_PAGES } from "../screens/publicPages.js";

export default function PlanningMainNavigation() {
  const hub = PUBLIC_PAGES.find((page) => page.cluster === "trip-planning" && page.isHub);
  return (
    <nav className="planning-main-navigation" aria-label="Main navigation">
      <a href={`${import.meta.env.BASE_URL}${hub.path.slice(1)}`}>{hub.label}</a>
    </nav>
  );
}
