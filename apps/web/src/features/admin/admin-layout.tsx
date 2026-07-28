import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const ADMIN_NAV = [
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/approaches", label: "Approaches" },
  { to: "/admin/timeline", label: "Timeline" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/settings", label: "Settings & Branding" },
];

export function AdminLayout() {
  const { hasRole, isLoading } = useAuth();
  if (isLoading) return null;
  if (!hasRole("SUPER_ADMIN")) return <Navigate to="/" replace />;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Administration</h1>
      <p className="mb-6 text-sm text-slate-500">Super Admin tools</p>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {ADMIN_NAV.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
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
      <Outlet />
    </div>
  );
}
