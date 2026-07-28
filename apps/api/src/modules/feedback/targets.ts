import { prisma } from "../../lib/prisma.js";

interface TargetOption {
  entityType: string;
  entityId: string;
  label: string;
}

interface SectionTargets {
  sectionId: string;
  title: string;
  items: TargetOption[];
}

/** Cascading dropdown data for the feedback drawer: page → sections → items. */
export async function getFeedbackTargets(pageSlug: string) {
  const page = await prisma.page.findUnique({
    where: { slug: pageSlug },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          blocks: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!page) return null;

  const sections: SectionTargets[] = page.sections.map((s) => ({
    sectionId: s.id,
    title: s.title,
    items: s.blocks.map((b) => ({
      entityType: "CONTENT_BLOCK",
      entityId: b.id,
      label: blockLabel(b.kind, b.payload),
    })),
  }));

  return {
    page: { entityType: "PAGE", entityId: page.id, label: page.title },
    sections,
  };
}

function blockLabel(kind: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  const title =
    (p.title as string) ?? (p.label as string) ?? (p.personaName as string) ?? (p.text as string);
  const text = title ? String(title).slice(0, 60) : kind.replaceAll("_", " ").toLowerCase();
  return `${text}`;
}
