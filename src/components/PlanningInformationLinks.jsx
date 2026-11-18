import { PUBLIC_PAGES, getRelatedPublicPages } from "../screens/publicPages.js";

export default function PlanningInformationLinks({ currentPath = "/", related = false }) {
  const Container = related ? "aside" : "nav";
  const pages = related ? getRelatedPublicPages(currentPath) : PUBLIC_PAGES.filter((page) => page.path !== currentPath);
  return (
    <Container className="planning-information-links" aria-label={related ? "Related" : "Trip planning information"}>
      <h2>{related ? "Related trip planning guides" : "Explore trip planning"}</h2>
      <ul>
        {pages.map((page) => (
          <li key={page.id}><a href={`${import.meta.env.BASE_URL}${page.path.slice(1)}`}>{page.linkLabel}</a></li>
        ))}
      </ul>
    </Container>
  );
}
