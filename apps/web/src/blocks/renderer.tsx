import type { ComponentType } from "react";
import type { BlockNode, PageEmbeds } from "./types";
import { HeroBlock, CtaBlock } from "./hero";
import { RichTextBlock } from "./rich-text";
import { KpiStripBlock } from "./kpi-strip";
import { GridGroupBlock, StatBlock, CardBlock, ListItemBlock, BlueprintBlockView } from "./grid";
import { ThemeGroupBlock, QuoteBlock } from "./voc";
import { ProblemStatementBlock } from "./problem";
import { DiagramBlock } from "./diagram";
import { DataTableBlock } from "./data-table";
import { ApproachEmbedBlock } from "./approach-embed";
import { TimelineEmbedBlock } from "./timeline-embed";

export interface BlockProps {
  block: BlockNode;
  embeds: PageEmbeds;
}

const registry: Record<string, ComponentType<BlockProps>> = {
  HERO: HeroBlock,
  RICH_TEXT: RichTextBlock,
  KPI_STRIP: KpiStripBlock,
  GRID_GROUP: GridGroupBlock,
  STAT: StatBlock,
  CARD: CardBlock,
  LIST_ITEM: ListItemBlock,
  QUOTE: QuoteBlock,
  THEME_GROUP: ThemeGroupBlock,
  PROBLEM_STATEMENT: ProblemStatementBlock,
  BLUEPRINT_BLOCK: BlueprintBlockView,
  DIAGRAM: DiagramBlock,
  DATA_TABLE: DataTableBlock,
  CTA: CtaBlock,
  APPROACH_EMBED: ApproachEmbedBlock,
  TIMELINE_EMBED: TimelineEmbedBlock,
};

export function BlockRenderer({ block, embeds }: BlockProps) {
  const Component = registry[block.kind];
  if (!Component) return null;
  return <Component block={block} embeds={embeds} />;
}
