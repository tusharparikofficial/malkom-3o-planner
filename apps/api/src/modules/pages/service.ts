import type { ContentBlock } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { resolveKpiValues } from "./kpis.js";

export interface BlockNode {
  id: string;
  kind: string;
  payload: unknown;
  order: number;
  status: string;
  children: BlockNode[];
}

function buildBlockTree(blocks: ContentBlock[]): BlockNode[] {
  const nodes = new Map<string, BlockNode>();
  for (const b of blocks) {
    nodes.set(b.id, {
      id: b.id,
      kind: b.kind,
      payload: b.payload,
      order: b.order,
      status: b.status,
      children: [],
    });
  }
  const roots: BlockNode[] = [];
  for (const b of blocks) {
    const node = nodes.get(b.id)!;
    const parent = b.parentId ? nodes.get(b.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const byOrder = (a: BlockNode, z: BlockNode) => a.order - z.order;
  roots.sort(byOrder);
  for (const node of nodes.values()) node.children.sort(byOrder);
  return roots;
}

export async function listPages() {
  return prisma.page.findMany({
    orderBy: { order: "asc" },
    select: { id: true, slug: true, title: true, summary: true, order: true, updatedAt: true },
  });
}

export async function getPageBySlug(slug: string, includeDrafts: boolean) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          blocks: {
            where: includeDrafts ? { status: { not: "ARCHIVED" } } : { status: "PUBLISHED" },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
  if (!page) return null;

  const sections = page.sections.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    order: s.order,
    blocks: buildBlockTree(s.blocks),
  }));

  const embeds = await resolveEmbeds(sections);
  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    sections,
    embeds,
  };
}

/** Resolve APPROACH_EMBED / TIMELINE_EMBED / KPI_STRIP data referenced by blocks. */
async function resolveEmbeds(sections: { blocks: BlockNode[] }[]) {
  const allBlocks = sections.flatMap((s) => flatten(s.blocks));

  const approachIds = allBlocks
    .filter((b) => b.kind === "APPROACH_EMBED")
    .map((b) => (b.payload as { approachId?: string }).approachId)
    .filter((id): id is string => Boolean(id));
  const wantsTimeline = allBlocks.some((b) => b.kind === "TIMELINE_EMBED");
  const kpiKeys = allBlocks
    .filter((b) => b.kind === "KPI_STRIP")
    .flatMap((b) => ((b.payload as { metrics?: { key: string }[] }).metrics ?? []).map((m) => m.key));

  const [approaches, timeline, kpis] = await Promise.all([
    approachIds.length
      ? prisma.approach.findMany({
          where: { id: { in: approachIds } },
          include: {
            options: { orderBy: { order: "asc" }, include: { scores: true } },
            criteria: { orderBy: { order: "asc" } },
            considerations: { orderBy: { order: "asc" } },
          },
        })
      : Promise.resolve([]),
    wantsTimeline
      ? prisma.timelinePhase.findMany({
          orderBy: { order: "asc" },
          include: { milestones: { orderBy: { order: "asc" } } },
        })
      : Promise.resolve([]),
    kpiKeys.length ? resolveKpiValues([...new Set(kpiKeys)]) : Promise.resolve({}),
  ]);

  return {
    approaches: Object.fromEntries(approaches.map((a) => [a.id, a])),
    timeline,
    kpis,
  };
}

function flatten(blocks: BlockNode[]): BlockNode[] {
  return blocks.flatMap((b) => [b, ...flatten(b.children)]);
}
