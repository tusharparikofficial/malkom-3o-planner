import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ENTITY_TYPES } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok } from "../../lib/envelope.js";

const threadQuery = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
});

const createSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1),
  parentId: z.string().optional(),
  body: z.string().min(1).max(2000),
});

/** Inline comments on any content item — Admin and above (PLANNING.md §4.2). */
export async function commentsRoutes(app: FastifyInstance) {
  app.get("/comments", { preHandler: [app.requireRole("ADMIN")] }, async (req) => {
    const q = threadQuery.parse(req.query);
    const comments = await prisma.comment.findMany({
      where: { entityType: q.entityType, entityId: q.entityId, parentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
      },
    });
    return ok(comments);
  });

  app.post("/comments", { preHandler: [app.requireRole("ADMIN")] }, async (req) => {
    const input = createSchema.parse(req.body);
    const comment = await prisma.comment.create({
      data: { ...input, userId: req.user!.id },
      include: { user: { select: { name: true } } },
    });
    return ok(comment);
  });
}
