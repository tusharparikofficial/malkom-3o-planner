import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { usePageTracking } from "@/lib/use-page-tracking";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackFab } from "@/features/feedback/feedback-fab";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/approach", label: "Approach & Considerations" },
  { to: "/business-problem", label: "Business Problem" },
  { to: "/solutions/blueprint", label: "Solutions", match: "/solutions" },
  { to: "/voice-of-customer", label: "Voice of Customer" },
];

export function AppLayout() {
  const { user, isLoading, hasRole, logout } = useAuth();
  const settings = useSettings();
  usePageTracking(Boolean(user));

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const siteTitle = String(settings?.settings["site.title"] ?? "MALKOM 3.0 MVP");
  const footerNotice = String(settings?.settings["site.footerNotice"] ?? "");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-primary font-bold text-white">
              M
            </span>
            <span className="hidden font-semibold text-slate-900 sm:block">{siteTitle}</span>
          </NavLink>

          <nav className="flex items-center gap-1 overflow-x-auto text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded px-3 py-2 font-medium transition-colors ${
                    isActive || (item.match && location.pathname.startsWith(item.match))
                      ? "bg-primary-soft text-primary"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {hasRole("SUPER_ADMIN") && (
              <NavLink to="/admin/feedback" className="rounded p-2 text-slate-500 hover:bg-slate-100">
                <Icon name="admin_panel_settings" className="text-xl" />
              </NavLink>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <Badge tone="primary">{user.role.replaceAll("_", " ").toLowerCase()}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void logout()} aria-label="Log out">
              <Icon name="logout" className="text-xl" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400">{footerNotice}</p>
      </footer>

      <FeedbackFab />
    </div>
  );
}
