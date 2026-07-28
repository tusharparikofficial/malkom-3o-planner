import { z } from "zod";

export const BLOCK_KINDS = [
  "HERO",
  "RICH_TEXT",
  "KPI_STRIP",
  "GRID_GROUP",
  "STAT",
  "CARD",
  "LIST_ITEM",
  "QUOTE",
  "THEME_GROUP",
  "PROBLEM_STATEMENT",
  "BLUEPRINT_BLOCK",
  "DIAGRAM",
  "IMAGE",
  "DATA_TABLE",
  "CTA",
  "APPROACH_EMBED",
  "TIMELINE_EMBED",
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

export const KPI_METRIC_KEYS = [
  "approaches.count",
  "options.count",
  "feedback.open",
  "feedback.resolved",
  "voices.count",
  "milestone.next.days",
] as const;
export type KpiMetricKey = (typeof KPI_METRIC_KEYS)[number];

const materialIcon = z.string().min(1).max(64);

export const heroPayload = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(400).optional(),
  badge: z.string().max(60).optional(),
  backgroundAssetId: z.string().optional(),
});

export const richTextPayload = z.object({
  markdown: z.string().min(1).max(20000),
});

export const kpiStripPayload = z.object({
  metrics: z
    .array(z.object({ key: z.enum(KPI_METRIC_KEYS), label: z.string().max(80).optional() }))
    .min(1)
    .max(6),
});

export const gridGroupPayload = z.object({
  title: z.string().max(160).optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
});

export const statPayload = z.object({
  label: z.string().min(1).max(120),
  value: z.string().min(1).max(60),
  icon: materialIcon.optional(),
  trend: z.string().max(60).optional(),
});

export const cardPayload = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
  icon: materialIcon.optional(),
  href: z.string().max(500).optional(),
});

export const listItemPayload = z.object({
  text: z.string().min(1).max(600),
  icon: materialIcon.optional(),
});

export const quotePayload = z.object({
  text: z.string().min(1).max(2000),
  personaName: z.string().min(1).max(120),
  personaRole: z.string().max(120).optional(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
});

export const themeGroupPayload = z.object({
  title: z.string().min(1).max(160),
  implication: z.string().min(1).max(1000),
});

export const problemStatementPayload = z.object({
  title: z.string().min(1).max(160),
  narrative: z.string().min(1).max(4000),
  impact: z.string().min(1).max(2000),
  severity: z.number().int().min(1).max(5),
  stakeholders: z.array(z.string().max(120)).max(20),
});

export const blueprintBlockPayload = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  layer: z.string().min(1).max(80),
  icon: materialIcon.optional(),
});

export const diagramPayload = z
  .object({
    source: z.enum(["MERMAID", "ASSET"]),
    mermaid: z.string().max(20000).optional(),
    assetId: z.string().optional(),
    caption: z.string().max(300).optional(),
  })
  .refine((v) => (v.source === "MERMAID" ? !!v.mermaid : !!v.assetId), {
    message: "MERMAID requires `mermaid` source text; ASSET requires `assetId`",
  });

export const imagePayload = z.object({
  assetId: z.string().min(1),
  alt: z.string().min(1).max(300),
  caption: z.string().max(300).optional(),
});

export const dataTablePayload = z.object({
  columns: z.array(z.string().max(120)).min(1).max(12),
  rows: z.array(z.array(z.string().max(1000))).max(200),
  caption: z.string().max(300).optional(),
});

export const ctaPayload = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(500),
  variant: z.enum(["primary", "outline"]).default("primary"),
});

export const approachEmbedPayload = z.object({
  approachId: z.string().min(1),
});

export const timelineEmbedPayload = z.object({});

export const blockPayloadSchemas: Record<BlockKind, z.ZodTypeAny> = {
  HERO: heroPayload,
  RICH_TEXT: richTextPayload,
  KPI_STRIP: kpiStripPayload,
  GRID_GROUP: gridGroupPayload,
  STAT: statPayload,
  CARD: cardPayload,
  LIST_ITEM: listItemPayload,
  QUOTE: quotePayload,
  THEME_GROUP: themeGroupPayload,
  PROBLEM_STATEMENT: problemStatementPayload,
  BLUEPRINT_BLOCK: blueprintBlockPayload,
  DIAGRAM: diagramPayload,
  IMAGE: imagePayload,
  DATA_TABLE: dataTablePayload,
  CTA: ctaPayload,
  APPROACH_EMBED: approachEmbedPayload,
  TIMELINE_EMBED: timelineEmbedPayload,
};

/** Kinds allowed as children of a group block; all others must be top-level. */
export const GROUP_CHILD_KINDS: Partial<Record<BlockKind, BlockKind[]>> = {
  GRID_GROUP: ["STAT", "CARD", "BLUEPRINT_BLOCK", "LIST_ITEM"],
  THEME_GROUP: ["QUOTE"],
};

export function validateBlockPayload(kind: BlockKind, payload: unknown) {
  return blockPayloadSchemas[kind].safeParse(payload);
}
