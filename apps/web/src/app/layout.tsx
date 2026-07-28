import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  usePageTracking(Boolean(user));

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 text-slate-400">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const siteTitle = String(settings?.settings["site.title"] ?? "MALKOM 3.0 MVP");
  const footerNotice = String(settings?.settings["site.footerNotice"] ?? "");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/" className="group flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-white shadow-sm transition-transform group-hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-primary), var(--brand-deep, #00405e))",
              }}
            >
              M
            </span>
            <span className="hidden font-semibold tracking-tight text-slate-900 sm:block">
              {siteTitle}
            </span>
          </NavLink>

          <nav className="flex items-center gap-0.5 overflow-x-auto text-sm">
            {NAV.map((item) => {
              const active = item.match
                ? location.pathname.startsWith(item.match)
                : item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-colors ${
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {hasRole("SUPER_ADMIN") && (
              <NavLink
                to="/admin/feedback"
                title="Administration"
                className={`rounded-lg p-2 transition-colors ${
                  location.pathname.startsWith("/admin")
                    ? "bg-primary-soft text-primary"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Icon name="admin_panel_settings" className="text-xl" />
              </NavLink>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight text-slate-900">{user.name}</div>
              <Badge tone="primary">{user.role.replaceAll("_", " ").toLowerCase()}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void logout()} aria-label="Log out">
              <Icon name="logout" className="text-xl" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/70 py-5 backdrop-blur-sm">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs leading-relaxed text-slate-400">
          {footerNotice}
        </p>
      </footer>

      <FeedbackFab />
    </div>
  );
}
