import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DIAGRAM_TYPES } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";
import { env } from "../../config/env.js";
import { generateDiagram } from "./ai.js";

const idParams = z.object({ id: z.string().min(1) });

// Light structural check server-side; the strict diagram-engine validator runs
// client-side (with a visual preview) before anything is saved.
const definitionShape = z.object({
  type: z.enum(DIAGRAM_TYPES),
  description: z.string().min(1),
  size: z.enum(["small", "medium", "large"]),
  positioning: z.enum(["auto", "manual"]),
  elements: z.array(z.record(z.unknown())).min(1).max(200),
});

const upsertSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(500).optional(),
  diagramType: z.enum(DIAGRAM_TYPES),
  definition: definitionShape.passthrough(),
});

const generateSchema = z.object({
  prompt: z.string().min(10).max(4000),
  diagramType: z.enum(DIAGRAM_TYPES),
  existingDefinition: z.unknown().optional(),
  previousError: z.string().max(2000).optional(),
});

/**
 * Diagram library. Viewing is open to any authenticated user (diagrams render
 * on pages); create/edit/delete and AI generation are SUPER_ADMIN only.
 */
export async function diagramsRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.requireRole("SUPER_ADMIN")] };

  app.get("/diagrams", { preHandler: [app.authenticate] }, async () => {
    const diagrams = await prisma.libraryDiagram.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        diagramType: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
      },
    });
    return ok(diagrams);
  });

  app.get("/diagrams/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const diagram = await prisma.libraryDiagram.findUnique({ where: { id } });
    if (!diagram) return reply.code(404).send(fail("Diagram not found"));
    return ok(diagram);
  });

  app.post("/admin/diagrams", guard, async (req) => {
    const input = upsertSchema.parse(req.body);
    const diagram = await prisma.libraryDiagram.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        diagramType: input.diagramType,
        definition: input.definition as never,
        createdById: req.user!.id,
      },
    });
    return ok(diagram);
  });

  app.patch("/admin/diagrams/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const input = upsertSchema.partial().parse(req.body);
    const existing = await prisma.libraryDiagram.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Diagram not found"));
    const diagram = await prisma.libraryDiagram.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.diagramType !== undefined ? { diagramType: input.diagramType } : {}),
        ...(input.definition !== undefined ? { definition: input.definition as never } : {}),
        updatedById: req.user!.id,
      },
    });
    return ok(diagram);
  });

  app.delete("/admin/diagrams/:id", guard, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const existing = await prisma.libraryDiagram.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send(fail("Diagram not found"));
    await prisma.$transaction([
      prisma.libraryDiagram.delete({ where: { id } }),
      prisma.auditLog.create({
        data: { actorId: req.user!.id, action: "DIAGRAM_DELETED", entityId: id },
      }),
    ]);
    return ok({ deleted: true });
  });

  app.post("/admin/diagrams/generate", guard, async (req, reply) => {
    if (!env.aiEnabled) {
      return reply
        .code(503)
        .send(fail("AI generation is not configured — set DEEPSEEK_API_KEY on the server"));
    }
    const input = generateSchema.parse(req.body);
    const definition = await generateDiagram(input);
    const parsed = definitionShape.passthrough().safeParse(definition);
    if (!parsed.success) {
      return reply
        .code(502)
        .send(
          fail(
            `AI output failed validation: ${parsed.error.issues[0]?.message ?? "wrong shape"} — try again`,
          ),
        );
    }
    return ok({ definition: parsed.data, aiEnabled: true });
  });
}
