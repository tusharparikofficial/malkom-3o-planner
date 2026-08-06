import { NavLink, useParams } from "react-router-dom";
import { PageView, usePageData } from "@/app/page-view";

/** Fallback tab list used until the page loads (matches the seeded sections). */
const DEFAULT_TABS = [
  { slug: "flow-diagram", label: "Flow Diagram" },
  { slug: "deployment-model", label: "Client Deployment" },
  { slug: "tech-stack", label: "Tech Stack" },
  { slug: "booking-flow", label: "Booking Flow" },
  { slug: "modules-pages", label: "Modules & Pages" },
  { slug: "engines-allocation", label: "Engines & Allocation" },
];

export function ArchitecturePage() {
  const { tab = DEFAULT_TABS[0].slug } = useParams();
  const { data: page } = usePageData("architecture");

  const tabs = page?.sections.length
    ? page.sections.map((s) => ({ slug: s.slug, label: s.title }))
    : DEFAULT_TABS;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        {page?.title ?? "Architecture & Flow"}
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        {page?.summary ??
          "Bookings flow, layered architecture & tech stack, modules, roles and core engines."}
      </p>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <NavLink
            key={t.slug}
            to={`/architecture/${t.slug}`}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <PageView slug="architecture" sectionSlug={tab} />
    </div>
  );
}
