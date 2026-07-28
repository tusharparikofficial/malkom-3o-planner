import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { roleAtLeast } from "@malkom/shared";
import { ok, fail } from "../../lib/envelope.js";
import { getPageBySlug, listPages } from "./service.js";

const slugParams = z.object({ slug: z.string().min(1).max(80) });
const pageQuery = z.object({ preview: z.coerce.boolean().optional() });

export async function pagesRoutes(app: FastifyInstance) {
  app.get("/pages", { preHandler: [app.authenticate] }, async () => {
    return ok(await listPages());
  });

  app.get("/pages/:slug", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { slug } = slugParams.parse(req.params);
    const { preview } = pageQuery.parse(req.query);
    const includeDrafts = Boolean(preview) && roleAtLeast(req.user!.role, "ADMIN");
    const page = await getPageBySlug(slug, includeDrafts);
    if (!page) return reply.code(404).send(fail("Page not found"));
    return ok(page);
  });
}
