import type { AnalyticsEventType } from "@malkom/shared";

interface QueuedEvent {
  type: AnalyticsEventType;
  pageSlug: string;
  sectionSlug?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 10;

let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const events = queue.slice(0, 50);
  queue = queue.slice(50);
  const body = JSON.stringify({ events });

  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/v1/analytics/events", body);
    return;
  }
  void fetch("/api/v1/analytics/events", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* analytics is fire-and-forget */
  });
}

export function trackEvent(event: QueuedEvent) {
  queue = [...queue, event];
  if (queue.length >= FLUSH_BATCH_SIZE) flush();
  if (!timer) {
    timer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
    window.addEventListener("pagehide", () => flush(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush(true);
    });
  }
}
