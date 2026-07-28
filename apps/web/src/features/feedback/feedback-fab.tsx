import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { trackEvent } from "@/lib/analytics";
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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          trackEvent({ type: "FEEDBACK_OPEN", pageSlug });
        }}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-hover"
        aria-label="Give feedback"
      >
        <Icon name="rate_review" className="text-2xl" />
      </button>
      {open && <FeedbackDrawer open={open} onOpenChange={setOpen} pageSlug={pageSlug} />}
    </>
  );
}
