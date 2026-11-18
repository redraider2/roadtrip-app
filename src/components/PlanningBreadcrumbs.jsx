import { PUBLIC_PAGES } from "../screens/publicPages.js";

export default function PlanningBreadcrumbs({ page }) {
  const hub = PUBLIC_PAGES.find((item) => item.cluster === page.cluster && item.isHub);
  return (
    <nav className="planning-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href={import.meta.env.BASE_URL}>Home</a></li>
        {hub && hub.path !== page.path ? <li><a href={`${import.meta.env.BASE_URL}${hub.path.slice(1)}`}>{hub.label}</a></li> : null}
        <li><span aria-current="page">{page.label}</span></li>
      </ol>
    </nav>
  );
}
