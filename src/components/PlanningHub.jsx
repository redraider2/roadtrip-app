import { PUBLIC_PAGES } from "../screens/publicPages.js";

export default function PlanningHub() {
  const pieces = PUBLIC_PAGES.filter((page) => page.cluster === "trip-planning" && !page.isHub);
  return (
    <section className="home-faq planning-hub" aria-labelledby="planning-hub-title">
      <h2 id="planning-hub-title">Start with these guides</h2>
      <ul>
        {pieces.map((page) => <li key={page.id}>
          <a href={`${import.meta.env.BASE_URL}${page.path.slice(1)}`}>{page.title}</a>
          <p>{page.description}</p>
        </li>)}
      </ul>
    </section>
  );
}
