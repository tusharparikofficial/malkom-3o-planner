import { z } from "zod";

export const EVENT_TYPES = [
  "PAGE_VIEW",
  "PAGE_EXIT",
  "SECTION_VIEW",
  "FEEDBACK_OPEN",
  "FEEDBACK_SUBMIT",
  "NAV_CLICK",
] as const;
export type AnalyticsEventType = (typeof EVENT_TYPES)[number];

export const analyticsEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  pageSlug: z.string().min(1).max(80),
  sectionSlug: z.string().max(80).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  meta: z.record(z.unknown()).optional(),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});
