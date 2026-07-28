import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";

const idParams = z.object({ id: z.string().min(1) });

const phaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "AT_RISK"]).default("PLANNED"),
  order: z.number().int().min(0),
});

const milestoneSchema = z.object({
  phaseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "AT_RISK", "SLIPPED"]).default("PLANNED"),
  order: z.number().int().min(0),
});

export async function adminTimelineRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.requireRole("SUPER_ADMIN")] };

  app.get("/timeline", { preHandler: [app.authenticate] }, async () => {
    const phases = await prisma.timelinePhase.findMany({
      orderBy: { order: "asc" },
      include: { milestones: { orderBy: { order: "asc" } } },
    });
    return ok(phases);
  });

  app.post("/admin/timeline/phases", guard, async (req) => {
    const input = phaseSchema.parse(req.body);
    return ok(await prisma.timelinePhase.create({ data: input }));
  });

  app.patch("/admin/timeline/phases/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = phaseSchema.partial().parse(req.body);
    const existing = await prisma.timelinePhase.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Phase not found"));
    return ok(await prisma.timelinePhase.update({ where: { id }, data: input }));
  });

  app.post("/admin/timeline/milestones", guard, async (req) => {
    const input = milestoneSchema.parse(req.body);
    return ok(await prisma.timelineMilestone.create({ data: input }));
  });

  app.patch("/admin/timeline/milestones/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = milestoneSchema.partial().parse(req.body);
    const existing = await prisma.timelineMilestone.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Milestone not found"));
    return ok(await prisma.timelineMilestone.update({ where: { id }, data: input }));
  });

  app.delete("/admin/timeline/phases/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.timelinePhase.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Phase not found"));
    await prisma.$transaction([
      prisma.timelineMilestone.deleteMany({ where: { phaseId: id } }),
      prisma.timelinePhase.delete({ where: { id } }),
    ]);
    return ok({ deleted: true });
  });

  app.delete("/admin/timeline/milestones/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.timelineMilestone.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Milestone not found"));
    await prisma.timelineMilestone.delete({ where: { id } });
    return ok({ deleted: true });
  });
}
