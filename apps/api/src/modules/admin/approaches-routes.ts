import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";
import { ensureScoreMatrix } from "../../jobs/score-matrix.js";

const idParams = z.object({ id: z.string().min(1) });

const approachSchema = z.object({
  title: z.string().min(1).max(200),
  context: z.string().min(1).max(4000),
  rationale: z.string().max(2000).optional(),
  recommendedOptionId: z.string().nullable().optional(),
  order: z.number().int().min(0),
});

const optionSchema = z.object({
  approachId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  pros: z.array(z.string().max(500)).max(20),
  cons: z.array(z.string().max(500)).max(20),
  effort: z.number().int().min(1).max(5).optional(),
  risk: z.number().int().min(1).max(5).optional(),
  order: z.number().int().min(0),
});

const criterionSchema = z.object({
  approachId: z.string().min(1),
  label: z.string().min(1).max(120),
  weight: z.number().int().min(1).max(10).default(1),
  order: z.number().int().min(0),
});

const scoreSchema = z.object({
  score: z.number().int().min(1).max(5).nullable(),
  note: z.string().max(500).optional(),
});

/** Approach Manager API — every mutation re-runs the score-matrix job (§5.5). */
export async function adminApproachesRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.requireRole("SUPER_ADMIN")] };

  app.get("/approaches", { preHandler: [app.authenticate] }, async () => {
    const approaches = await prisma.approach.findMany({
      orderBy: { order: "asc" },
      include: {
        options: { orderBy: { order: "asc" }, include: { scores: true } },
        criteria: { orderBy: { order: "asc" } },
        considerations: { orderBy: { order: "asc" } },
      },
    });
    return ok(approaches);
  });

  app.post("/admin/approaches", guard, async (req) => {
    const input = approachSchema.parse(req.body);
    const approach = await prisma.approach.create({ data: input });
    return ok(approach);
  });

  app.patch("/admin/approaches/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = approachSchema.partial().parse(req.body);
    const existing = await prisma.approach.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Approach not found"));
    const approach = await prisma.approach.update({ where: { id }, data: input });
    return ok(approach);
  });

  app.post("/admin/approaches/options", guard, async (req) => {
    const input = optionSchema.parse(req.body);
    const option = await prisma.approachOption.create({ data: input });
    void ensureScoreMatrix(input.approachId).catch((err) => req.log.error({ err }, "matrix job failed"));
    return ok(option);
  });

  app.post("/admin/approaches/criteria", guard, async (req) => {
    const input = criterionSchema.parse(req.body);
    const criterion = await prisma.criterion.create({ data: input });
    void ensureScoreMatrix(input.approachId).catch((err) => req.log.error({ err }, "matrix job failed"));
    return ok(criterion);
  });

  app.patch("/admin/approaches/scores/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = scoreSchema.parse(req.body);
    const existing = await prisma.criterionScore.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Score not found"));
    const score = await prisma.criterionScore.update({ where: { id }, data: input });
    return ok(score);
  });
}
