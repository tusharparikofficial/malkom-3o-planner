import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { ok } from "../../lib/envelope.js";

const idParams = z.object({ id: z.string().min(1) });

/**
 * Notifications targeted at the current user (directly or via role).
 * Role-targeted read state is shared across that role — acceptable for the
 * small Super Admin group in this MVP.
 */
export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/notifications", { preHandler: [app.authenticate] }, async (req) => {
    const target = {
      OR: [{ recipientId: req.user!.id }, { recipientRole: req.user!.role as never }],
    };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: target,
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      }),
      prisma.notification.count({ where: { ...target, readAt: null } }),
    ]);
    return ok({ items, unread });
  });

  app.post("/notifications/read-all", { preHandler: [app.authenticate] }, async (req) => {
    await prisma.notification.updateMany({
      where: {
        OR: [{ recipientId: req.user!.id }, { recipientRole: req.user!.role as never }],
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return ok({ read: true });
  });

  app.post("/notifications/:id/read", { preHandler: [app.authenticate] }, async (req) => {
    const { id } = idParams.parse(req.params);
    await prisma.notification.updateMany({
      where: {
        id,
        OR: [{ recipientId: req.user!.id }, { recipientRole: req.user!.role as never }],
      },
      data: { readAt: new Date() },
    });
    return ok({ read: true });
  });
}
