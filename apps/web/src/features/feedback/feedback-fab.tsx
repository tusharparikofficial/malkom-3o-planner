import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { trackEvent } from "@/lib/analytics";
import { IS_STATIC } from "@/lib/static";
import { FeedbackDrawer } from "./feedback-drawer";

function pageSlugFromPath(pathname: string): string {
  if (pathname === "/") return "home";
  const first = pathname.replace(/^\//, "").split("/")[0] ?? "home";
  return first;
}

/** Global floating feedback button — visible on every page, every role. */
export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const pageSlug = pageSlugFromPath(location.pathname);
  if (IS_STATIC) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackEvent({ type: "FEEDBACK_OPEN", pageSlug });
        }}
        className="group fixed bottom-6 right-6 z-30 flex h-14 items-center gap-0 rounded-full px-[15px] text-white shadow-fab transition-all hover:gap-2 hover:pl-5 hover:pr-6"
        style={{
          background:
            "linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))",
        }}
        aria-label="Give feedback"
      >
        <Icon name="rate_review" className="text-2xl" />
        <span className="w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-300 group-hover:w-auto group-hover:opacity-100">
          Give feedback
        </span>
      </button>
      {open && <FeedbackDrawer open={open} onOpenChange={setOpen} pageSlug={pageSlug} />}
    </>
  );
}
