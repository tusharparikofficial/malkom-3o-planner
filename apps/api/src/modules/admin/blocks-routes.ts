import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BLOCK_KINDS, GROUP_CHILD_KINDS, validateBlockPayload, type BlockKind } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";

const idParams = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  sectionId: z.string().min(1),
  parentId: z.string().optional(),
  kind: z.enum(BLOCK_KINDS),
  payload: z.unknown(),
  order: z.number().int().min(0),
});

const updateSchema = z.object({
  payload: z.unknown().optional(),
  order: z.number().int().min(0).optional(),
  note: z.string().max(300).optional(),
});

/** Content block CRUD + publish workflow — the authoring studio's API (Phase 3 UI). */
export async function adminBlocksRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.requireRole("SUPER_ADMIN")] };

  app.post("/admin/blocks", guard, async (req, reply) => {
    const input = createSchema.parse(req.body);

    const parsed = validateBlockPayload(input.kind, input.payload);
    if (!parsed.success) {
      return reply.code(400).send(fail(`Invalid ${input.kind} payload: ${parsed.error.message}`));
    }
    if (input.parentId) {
      const parent = await prisma.contentBlock.findUnique({ where: { id: input.parentId } });
      const allowed = parent && (GROUP_CHILD_KINDS[parent.kind as BlockKind] ?? []).includes(input.kind);
      if (!allowed) return reply.code(400).send(fail("Invalid parent for this block kind"));
    }

    const block = await prisma.contentBlock.create({
      data: {
        sectionId: input.sectionId,
        parentId: input.parentId ?? null,
        kind: input.kind,
        payload: parsed.data,
        order: input.order,
        createdById: req.user!.id,
      },
    });
    return ok(block);
  });

  app.patch("/admin/blocks/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = updateSchema.parse(req.body);
    const existing = await prisma.contentBlock.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Block not found"));

    let payload = existing.payload;
    if (input.payload !== undefined) {
      const parsed = validateBlockPayload(existing.kind as BlockKind, input.payload);
      if (!parsed.success) {
        return reply.code(400).send(fail(`Invalid ${existing.kind} payload: ${parsed.error.message}`));
      }
      payload = parsed.data;
    }

    const [, block] = await prisma.$transaction([
      // snapshot BEFORE the edit — powers revision history / revert
      prisma.contentRevision.create({
        data: {
          blockId: id,
          kind: existing.kind,
          payload: existing.payload as never,
          status: existing.status,
          editedById: req.user!.id,
          note: input.note ?? null,
        },
      }),
      prisma.contentBlock.update({
        where: { id },
        data: {
          payload: payload as never,
          ...(input.order !== undefined ? { order: input.order } : {}),
          updatedById: req.user!.id,
          status: "DRAFT",
        },
      }),
    ]);
    return ok(block);
  });

  app.post("/admin/blocks/:id/publish", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.contentBlock.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Block not found"));
    const [block] = await prisma.$transaction([
      prisma.contentBlock.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date(), updatedById: req.user!.id },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, action: "BLOCK_PUBLISHED", entityType: "CONTENT_BLOCK", entityId: id },
      }),
    ]);
    return ok(block);
  });

  app.post("/admin/blocks/:id/archive", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.contentBlock.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Block not found"));
    const block = await prisma.contentBlock.update({
      where: { id },
      data: { status: "ARCHIVED", updatedById: req.user!.id },
    });
    return ok(block);
  });

  app.get("/admin/blocks/:id/revisions", guard, async (req) => {
    const { id } = idParams.parse(req.params);
    const revisions = await prisma.contentRevision.findMany({
      where: { blockId: id },
      orderBy: { createdAt: "desc" },
      include: { editedBy: { select: { name: true } } },
    });
    return ok(revisions);
  });
}
