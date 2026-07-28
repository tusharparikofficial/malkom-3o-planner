import { z } from "zod";

export const FEEDBACK_TYPES = ["GENERAL", "SUGGESTION", "EDIT_PROPOSAL", "QUESTION", "CONCERN"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_STATUSES = ["OPEN", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "RESOLVED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const ENTITY_TYPES = [
  "PAGE",
  "SECTION",
  "CONTENT_BLOCK",
  "APPROACH",
  "APPROACH_OPTION",
  "CRITERION",
  "CRITERION_SCORE",
  "CONSIDERATION",
  "TIMELINE_PHASE",
  "TIMELINE_MILESTONE",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const feedbackEntrySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().min(10).max(2000),
  proposedText: z.string().max(5000).optional(),
});
export type FeedbackEntryInput = z.infer<typeof feedbackEntrySchema>;

export const feedbackBatchSchema = z.object({
  entries: z.array(feedbackEntrySchema).min(1).max(20),
});

export const feedbackStatusChangeSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
  note: z.string().max(1000).optional(),
});
