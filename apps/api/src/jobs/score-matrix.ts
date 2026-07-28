import { prisma } from "../lib/prisma.js";

/**
 * Background generation (PLANNING.md §5.5): ensure a CriterionScore row exists
 * for every option × criterion pair of an approach, and prune orphans.
 * Called after any approach/option/criterion mutation.
 */
export async function ensureScoreMatrix(approachId: string): Promise<void> {
  const approach = await prisma.approach.findUnique({
    where: { id: approachId },
    include: { options: { select: { id: true } }, criteria: { select: { id: true } } },
  });
  if (!approach) return;

  const existing = await prisma.criterionScore.findMany({
    where: { criterion: { approachId } },
    select: { id: true, criterionId: true, optionId: true },
  });
  const have = new Set(existing.map((s) => `${s.criterionId}:${s.optionId}`));

  const missing = approach.criteria.flatMap((c) =>
    approach.options
      .filter((o) => !have.has(`${c.id}:${o.id}`))
      .map((o) => ({ criterionId: c.id, optionId: o.id })),
  );

  const validOptionIds = new Set(approach.options.map((o) => o.id));
  const orphanIds = existing.filter((s) => !validOptionIds.has(s.optionId)).map((s) => s.id);

  await prisma.$transaction([
    ...(missing.length ? [prisma.criterionScore.createMany({ data: missing })] : []),
    ...(orphanIds.length
      ? [prisma.criterionScore.deleteMany({ where: { id: { in: orphanIds } } })]
      : []),
  ]);
}
