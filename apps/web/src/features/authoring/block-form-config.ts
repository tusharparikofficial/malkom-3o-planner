import { KPI_METRIC_KEYS } from "@malkom/shared";

/**
 * Field descriptors that shape each block kind's editor form.
 * `stringlist` renders one entry per line; `objectlist` falls back to JSON.
 * Kinds without an entry get the raw JSON editor.
 */
export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "markdown" | "number" | "select" | "stringlist" | "icon" | "approach";
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
}

export const BLOCK_FORMS: Record<string, FieldDef[]> = {
  HERO: [
    { name: "title", label: "Title", type: "text" },
    { name: "subtitle", label: "Subtitle", type: "textarea" },
    { name: "badge", label: "Badge text", type: "text", placeholder: "e.g. MVP Build in progress" },
  ],
  RICH_TEXT: [
    {
      name: "markdown",
      label: "Content (Markdown)",
      type: "markdown",
      help: "Supports **bold**, lists, tables (GitHub-flavoured markdown).",
    },
  ],
  KPI_STRIP: [
    {
      name: "metrics",
      label: "Metrics (one per line: key | label)",
      type: "stringlist",
      help: `Valid keys: ${KPI_METRIC_KEYS.join(", ")}`,
    },
  ],
  GRID_GROUP: [
    { name: "title", label: "Group title (optional)", type: "text" },
    {
      name: "columns",
      label: "Columns",
      type: "select",
      options: [
        { value: "2", label: "2 columns" },
        { value: "3", label: "3 columns" },
        { value: "4", label: "4 columns" },
      ],
    },
  ],
  STAT: [
    { name: "label", label: "Label", type: "text" },
    { name: "value", label: "Value", type: "text" },
    { name: "icon", label: "Material icon name", type: "icon" },
    { name: "trend", label: "Trend note (optional)", type: "text" },
  ],
  CARD: [
    { name: "title", label: "Title", type: "text" },
    { name: "body", label: "Body", type: "textarea" },
    { name: "icon", label: "Material icon name", type: "icon" },
    { name: "href", label: "Link (optional, e.g. /approach)", type: "text" },
  ],
  LIST_ITEM: [
    { name: "text", label: "Text", type: "text" },
    { name: "icon", label: "Material icon name", type: "icon" },
  ],
  QUOTE: [
    { name: "text", label: "Quote", type: "textarea" },
    { name: "personaName", label: "Person / persona", type: "text" },
    { name: "personaRole", label: "Role (optional)", type: "text" },
    {
      name: "sentiment",
      label: "Sentiment",
      type: "select",
      options: [
        { value: "POSITIVE", label: "Positive" },
        { value: "NEUTRAL", label: "Neutral" },
        { value: "NEGATIVE", label: "Negative" },
      ],
    },
  ],
  THEME_GROUP: [
    { name: "title", label: "Theme title", type: "text" },
    { name: "implication", label: "Implication for the MVP", type: "textarea" },
  ],
  PROBLEM_STATEMENT: [
    { name: "title", label: "Title", type: "text" },
    { name: "narrative", label: "Narrative", type: "textarea" },
    { name: "impact", label: "Impact", type: "textarea" },
    { name: "severity", label: "Severity (1–5)", type: "number", min: 1, max: 5 },
    { name: "stakeholders", label: "Stakeholders (one per line)", type: "stringlist" },
  ],
  BLUEPRINT_BLOCK: [
    { name: "title", label: "Title", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "layer", label: "Layer", type: "text", placeholder: "Presentation / Application / Data" },
    { name: "icon", label: "Material icon name", type: "icon" },
  ],
  DIAGRAM: [
    {
      name: "mermaid",
      label: "Mermaid source",
      type: "markdown",
      help: "Rendered as a diagram on the page (https://mermaid.js.org). Source is fixed to MERMAID.",
    },
    { name: "caption", label: "Caption (optional)", type: "text" },
  ],
  CTA: [
    { name: "label", label: "Button label", type: "text" },
    { name: "href", label: "Link", type: "text" },
    {
      name: "variant",
      label: "Style",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "outline", label: "Outline" },
      ],
    },
  ],
  APPROACH_EMBED: [{ name: "approachId", label: "Approach", type: "approach" }],
  TIMELINE_EMBED: [],
};

/** Top-level kinds offered by the section "add block" palette. */
export const TOP_LEVEL_KINDS: { kind: string; label: string; icon: string }[] = [
  { kind: "RICH_TEXT", label: "Text", icon: "notes" },
  { kind: "HERO", label: "Hero", icon: "panorama" },
  { kind: "KPI_STRIP", label: "KPI strip", icon: "monitoring" },
  { kind: "GRID_GROUP", label: "Grid", icon: "grid_view" },
  { kind: "THEME_GROUP", label: "VoC theme", icon: "forum" },
  { kind: "PROBLEM_STATEMENT", label: "Problem", icon: "report_problem" },
  { kind: "DIAGRAM", label: "Diagram", icon: "account_tree" },
  { kind: "DATA_TABLE", label: "Table", icon: "table_chart" },
  { kind: "CTA", label: "Button", icon: "smart_button" },
  { kind: "APPROACH_EMBED", label: "Approach", icon: "alt_route" },
  { kind: "TIMELINE_EMBED", label: "Timeline", icon: "timeline" },
];

export const CHILD_KIND_META: Record<string, { label: string; icon: string }> = {
  STAT: { label: "Stat", icon: "tag" },
  CARD: { label: "Card", icon: "dashboard" },
  LIST_ITEM: { label: "List item", icon: "check_circle" },
  BLUEPRINT_BLOCK: { label: "Blueprint block", icon: "widgets" },
  QUOTE: { label: "Quote", icon: "format_quote" },
};

/** Sensible starting payload per kind so validation passes on first save. */
export const KIND_DEFAULTS: Record<string, unknown> = {
  HERO: { title: "New hero title" },
  RICH_TEXT: { markdown: "Write your content here…" },
  KPI_STRIP: { metrics: [{ key: "approaches.count", label: "Approaches" }] },
  GRID_GROUP: { columns: 3 },
  STAT: { label: "New stat", value: "0" },
  CARD: { title: "New card", body: "Describe it…" },
  LIST_ITEM: { text: "New item" },
  QUOTE: { text: "New quote…", personaName: "Persona", sentiment: "NEUTRAL" },
  THEME_GROUP: { title: "New theme", implication: "What it means for the MVP…" },
  PROBLEM_STATEMENT: {
    title: "New problem",
    narrative: "Describe the problem…",
    impact: "What it costs…",
    severity: 3,
    stakeholders: [],
  },
  BLUEPRINT_BLOCK: { title: "New block", description: "Describe it…", layer: "Application" },
  DIAGRAM: { source: "MERMAID", mermaid: "graph LR\n  A --> B" },
  DATA_TABLE: { columns: ["Column 1", "Column 2"], rows: [["", ""]] },
  CTA: { label: "Learn more", href: "/", variant: "primary" },
  APPROACH_EMBED: { approachId: "" },
  TIMELINE_EMBED: {},
};
