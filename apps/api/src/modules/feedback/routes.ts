import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { feedbackBatchSchema, feedbackStatusChangeSchema } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";
import { getFeedbackTargets } from "./targets.js";

const targetsQuery = z.object({ page: z.string().min(1).max(80) });
const listQuery = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const idParams = z.object({ id: z.string().min(1) });

export async function feedbackRoutes(app: FastifyInstance) {
  app.get("/feedback/targets", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { page } = targetsQuery.parse(req.query);
    const targets = await getFeedbackTargets(page);
    if (!targets) return reply.code(404).send(fail("Page not found"));
    return ok(targets);
  });

  app.post("/feedback", { preHandler: [app.authenticate] }, async (req) => {
    const { entries } = feedbackBatchSchema.parse(req.body);
    const created = await prisma.$transaction(
      entries.map((entry) =>
        prisma.feedback.create({
          data: { ...entry, userId: req.user!.id },
        }),
      ),
    );
    return ok({ created: created.length, ids: created.map((f) => f.id) });
  });

  app.get("/feedback/mine", { preHandler: [app.authenticate] }, async (req) => {
    const items = await prisma.feedback.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(items);
  });

  // ── Super Admin dashboard ────────────────────────────────────────────────
  app.get("/admin/feedback", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async (req) => {
    const q = listQuery.parse(req.query);
    const where = q.status ? { status: q.status as never } : {};
    const [total, items] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);
    return ok(items, { total, page: q.page, limit: q.limit });
  });

  app.patch(
    "/admin/feedback/:id/status",
    { preHandler: [app.requireRole("SUPER_ADMIN")] },
    async (req, reply) => {
      const { id } = idParams.parse(req.params);
      const { status, note } = feedbackStatusChangeSchema.parse(req.body);
      const existing = await prisma.feedback.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send(fail("Feedback not found"));

      const [updated] = await prisma.$transaction([
        prisma.feedback.update({ where: { id }, data: { status } }),
        prisma.feedbackActivity.create({
          data: {
            feedbackId: id,
            actorId: req.user!.id,
            fromStatus: existing.status,
            toStatus: status,
            note: note ?? null,
          },
        }),
      ]);
      return ok(updated);
    },
  );
}
