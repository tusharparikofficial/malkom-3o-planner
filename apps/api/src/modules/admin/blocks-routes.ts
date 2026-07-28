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

    const payloadChanged = input.payload !== undefined;
    let payload = existing.payload;
    if (payloadChanged) {
      const parsed = validateBlockPayload(existing.kind as BlockKind, input.payload);
      if (!parsed.success) {
        return reply.code(400).send(fail(`Invalid ${existing.kind} payload: ${parsed.error.message}`));
      }
      payload = parsed.data;
    }

    // Pure reorders don't snapshot a revision or demote a published block.
    const ops = [
      ...(payloadChanged
        ? [
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
          ]
        : []),
      prisma.contentBlock.update({
        where: { id },
        data: {
          ...(payloadChanged ? { payload: payload as never, status: "DRAFT" as const } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          updatedById: req.user!.id,
        },
      }),
    ];
    const results = await prisma.$transaction(ops);
    return ok(results[results.length - 1]);
  });

  app.post("/admin/blocks/:id/revert/:revisionId", guard, async (req, reply) => {
    const { id, revisionId } = z
      .object({ id: z.string().min(1), revisionId: z.string().min(1) })
      .parse(req.params);
    const [existing, revision] = await Promise.all([
      prisma.contentBlock.findUnique({ where: { id } }),
      prisma.contentRevision.findUnique({ where: { id: revisionId } }),
    ]);
    if (!existing || !revision || revision.blockId !== id) {
      return reply.code(404).send(fail("Block or revision not found"));
    }
    const [, , block] = await prisma.$transaction([
      // snapshot the current state so the revert itself is revertible
      prisma.contentRevision.create({
        data: {
          blockId: id,
          kind: existing.kind,
          payload: existing.payload as never,
          status: existing.status,
          editedById: req.user!.id,
          note: "before revert",
        },
      }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, action: "BLOCK_REVERTED", entityType: "CONTENT_BLOCK", entityId: id },
      }),
      prisma.contentBlock.update({
        where: { id },
        data: { payload: revision.payload as never, status: "DRAFT", updatedById: req.user!.id },
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
