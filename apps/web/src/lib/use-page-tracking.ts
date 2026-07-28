import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "./analytics";

function slugFromPath(pathname: string): string {
  if (pathname === "/") return "home";
  return pathname.replace(/^\//, "").replaceAll("/", ":");
}

/** PAGE_VIEW on route enter, PAGE_EXIT with visibility-aware dwell on leave. */
export function usePageTracking(enabled: boolean) {
  const location = useLocation();
  const started = useRef<number>(Date.now());
  const current = useRef<string>(slugFromPath(location.pathname));

  useEffect(() => {
    if (!enabled) return;
    const slug = slugFromPath(location.pathname);
    trackEvent({ type: "PAGE_VIEW", pageSlug: slug });
    started.current = Date.now();
    current.current = slug;

    return () => {
      trackEvent({
        type: "PAGE_EXIT",
        pageSlug: current.current,
        durationMs: Date.now() - started.current,
      });
    };
  }, [location.pathname, enabled]);
}
