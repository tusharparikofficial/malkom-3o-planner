import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analyticsBatchSchema } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";

const userParams = z.object({ id: z.string().min(1) });

export async function analyticsRoutes(app: FastifyInstance) {
  // Batch ingest — also the sendBeacon target, so it must accept text bodies.
  app.post("/analytics/events", { preHandler: [app.authenticate] }, async (req) => {
    const raw = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { events } = analyticsBatchSchema.parse(raw);
    await prisma.analyticsEvent.createMany({
      data: events.map((e) => ({
        userId: req.user!.id,
        sessionId: req.user!.sessionId,
        type: e.type,
        pageSlug: e.pageSlug,
        sectionSlug: e.sectionSlug ?? null,
        durationMs: e.durationMs ?? null,
        meta: (e.meta as never) ?? undefined,
      })),
    });
    return ok({ ingested: events.length });
  });

  // ── Super Admin dashboards ───────────────────────────────────────────────
  app.get("/admin/analytics/summary", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async () => {
    const [totalUsers, totalViews, byPage, dwellByPage] = await Promise.all([
      prisma.user.count(),
      prisma.analyticsEvent.count({ where: { type: "PAGE_VIEW" } }),
      prisma.analyticsEvent.groupBy({
        by: ["pageSlug"],
        where: { type: "PAGE_VIEW" },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["pageSlug"],
        where: { type: "PAGE_EXIT", durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
    ]);
    const dwell = new Map(dwellByPage.map((d) => [d.pageSlug, Math.round(d._avg.durationMs ?? 0)]));
    return ok({
      totalUsers,
      totalViews,
      pages: byPage.map((p) => ({
        pageSlug: p.pageSlug,
        views: p._count._all,
        avgDwellMs: dwell.get(p.pageSlug) ?? null,
      })),
    });
  });

  app.get("/admin/analytics/users", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastSeenAt: true,
        _count: { select: { events: true, feedback: true } },
      },
      orderBy: { lastSeenAt: "desc" },
    });
    return ok(users);
  });

  app.get(
    "/admin/analytics/users/:id",
    { preHandler: [app.requireRole("SUPER_ADMIN")] },
    async (req, reply) => {
      const { id } = userParams.parse(req.params);
      const user = await prisma.user.findUnique({
        select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
        where: { id },
      });
      if (!user) return reply.code(404).send(fail("User not found"));

      const [byPage, recent] = await Promise.all([
        prisma.analyticsEvent.groupBy({
          by: ["pageSlug", "type"],
          where: { userId: id, type: { in: ["PAGE_VIEW", "PAGE_EXIT"] } },
          _count: { _all: true },
          _avg: { durationMs: true },
        }),
        prisma.analyticsEvent.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { type: true, pageSlug: true, durationMs: true, createdAt: true },
        }),
      ]);
      return ok({ user, byPage, recent });
    },
  );
}
