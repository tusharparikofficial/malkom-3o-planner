import { NavLink, useParams } from "react-router-dom";
import { PageView } from "@/app/page-view";

const TABS = [
  { slug: "blueprint", label: "Blueprint" },
  { slug: "hld", label: "High-Level Architecture" },
  { slug: "lld", label: "Low-Level Architecture" },
  { slug: "timeline", label: "Timeline" },
];

export function SolutionsPage() {
  const { tab = "blueprint" } = useParams();

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Solutions</h1>
      <p className="mb-6 text-sm text-slate-500">
        Blueprint, architecture views and the delivery timeline.
      </p>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.slug}
            to={`/solutions/${t.slug}`}
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
      <PageView slug="solutions" sectionSlug={tab} />
    </div>
  );
}
