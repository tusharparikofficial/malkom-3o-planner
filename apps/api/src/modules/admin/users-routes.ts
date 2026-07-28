import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ROLES } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { ok, fail } from "../../lib/envelope.js";

const idParams = z.object({ id: z.string().min(1) });
const roleBody = z.object({ role: z.enum(ROLES) });

export async function adminUsersRoutes(app: FastifyInstance) {
  app.get("/admin/users", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { feedback: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return ok(users);
  });

  app.patch(
    "/admin/users/:id/role",
    { preHandler: [app.requireRole("SUPER_ADMIN")] },
    async (req, reply) => {
      const { id } = idParams.parse(req.params);
      const { role } = roleBody.parse(req.body);
      if (id === req.user!.id) {
        return reply.code(400).send(fail("You cannot change your own role"));
      }
      const [user] = await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { role } }),
        prisma.auditLog.create({
          data: { actorId: req.user!.id, action: "ROLE_CHANGED", entityId: id, meta: { role } },
        }),
      ]);
      return ok({ id: user.id, role: user.role });
    },
  );
}
