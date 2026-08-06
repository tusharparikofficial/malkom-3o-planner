import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { usePageTracking } from "@/lib/use-page-tracking";
import { IS_STATIC } from "@/lib/static";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { FeedbackFab } from "@/features/feedback/feedback-fab";
import { EditModeToggle } from "@/features/authoring/edit-mode";
import { NotificationBell } from "@/features/notifications/bell";

const NAV = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/approach", label: "Approach & Considerations", icon: "alt_route" },
  { to: "/business-problem", label: "Business Problem", icon: "report_problem" },
  { to: "/solutions/blueprint", label: "Solutions", icon: "architecture", match: "/solutions" },
  { to: "/architecture/flow-diagram", label: "Architecture & Flow", icon: "account_tree", match: "/architecture" },
  { to: "/assembler", label: "Assembler Demo", icon: "widgets" },
  { to: "/voice-of-customer", label: "Voice of Customer", icon: "record_voice_over" },
];

export function AppLayout() {
  const { user, isLoading, hasRole, logout } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const isActive = (item: (typeof NAV)[number]) =>
    item.match
      ? location.pathname.startsWith(item.match)
      : item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to);

  const brandMark = (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-white shadow-sm"
      style={{
        background: "linear-gradient(135deg, var(--brand-primary), var(--brand-deep, #00405e))",
      }}
    >
      M
    </span>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Icon name="menu" className="text-xl" />
        </button>
        {brandMark}
        <span className="font-semibold tracking-tight text-slate-900">{siteTitle}</span>
      </header>

      {/* Backdrop (mobile) */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Vertical sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/70 bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <NavLink
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4"
        >
          {brandMark}
          <span className="font-semibold leading-tight tracking-tight text-slate-900">
            {siteTitle}
          </span>
        </NavLink>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item)
                  ? "bg-primary-soft text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon name={item.icon} className="text-xl" />
              <span className="leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-slate-100 px-3 py-3">
          <EditModeToggle />
          {hasRole("SUPER_ADMIN") && (
            <>
              <NotificationBell />
              <NavLink
                to="/admin/feedback"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname.startsWith("/admin")
                    ? "bg-primary-soft text-primary"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon name="admin_panel_settings" className="text-xl" />
                Administration
              </NavLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
            {user.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium leading-tight text-slate-900">
              {user.name}
            </div>
            <Badge tone="primary">{user.role.replaceAll("_", " ").toLowerCase()}</Badge>
          </div>
          {!IS_STATIC && (
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Log out"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon name="logout" className="text-xl" />
            </button>
          )}
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
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
