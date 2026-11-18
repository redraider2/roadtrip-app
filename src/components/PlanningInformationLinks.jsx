import { PUBLIC_PAGES } from "../screens/publicPages.js";

export default function PlanningInformationLinks({ currentPath = "/" }) {
  return (
    <nav className="planning-information-links" aria-label="Trip planning information">
      <h2>Explore trip planning</h2>
      <ul>
        {PUBLIC_PAGES.filter((page) => page.path !== currentPath).map((page) => (
          <li key={page.id}><a href={`${import.meta.env.BASE_URL}${page.path.slice(1)}`}>{page.linkLabel}</a></li>
        ))}
      </ul>
    </nav>
  );
}
