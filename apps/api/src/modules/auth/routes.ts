import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../../lib/envelope.js";
import { env } from "../../config/env.js";
import { createSaml } from "./saml.js";
import { provisionUser } from "./provisioning.js";

const devLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  const saml = createSaml();

  app.get("/auth/login", async (req, reply) => {
    if (!saml) {
      if (env.devLoginEnabled) return reply.redirect(`${env.APP_BASE_URL}/login?dev=1`);
      return reply.code(503).send(fail("SSO is not configured yet. Contact the administrator."));
    }
    const url = await saml.getAuthorizeUrlAsync("", undefined, {});
    return reply.redirect(url);
  });

  app.post("/auth/callback", async (req, reply) => {
    if (!saml) return reply.code(503).send(fail("SSO is not configured"));
    try {
      const body = req.body as Record<string, string>;
      const { profile } = await saml.validatePostResponseAsync(body);
      if (!profile?.nameID) {
        return reply.redirect(`${env.APP_BASE_URL}/login?error=saml_no_identity`);
      }
      const email = String(profile.nameID);
      const attrs = profile as Record<string, unknown>;
      const name =
        (attrs["displayName"] as string | undefined) ??
        (attrs["name"] as string | undefined) ??
        null;

      const user = await provisionUser({ ssoUserId: email, email, name });
      await app.createSession(user.id, req.headers["user-agent"], reply);
      return reply.redirect(env.APP_BASE_URL);
    } catch (err) {
      req.log.error({ err }, "SAML assertion validation failed");
      return reply.redirect(`${env.APP_BASE_URL}/login?error=saml_auth_failed`);
    }
  });

  app.get("/auth/metadata", async (_req, reply) => {
    if (!saml) return reply.code(503).send(fail("SSO is not configured"));
    const xml = saml.generateServiceProviderMetadata(null, null);
    return reply.type("application/samlmetadata+xml").send(xml);
  });

  // Development-only fake login — hard-disabled outside NODE_ENV=development.
  app.post("/auth/dev-login", async (req, reply) => {
    if (!env.devLoginEnabled) return reply.code(404).send(fail("Not found"));
    const input = devLoginSchema.parse(req.body);
    const user = await provisionUser({
      ssoUserId: input.email.toLowerCase(),
      email: input.email,
      name: input.name ?? null,
    });
    await app.createSession(user.id, req.headers["user-agent"], reply);
    return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  app.post("/auth/logout", { preHandler: [app.authenticate] }, async (req, reply) => {
    await app.destroySession(req, reply);
    return ok({ loggedOut: true, sloUrl: env.SAML_SLO_URL ?? null });
  });

  app.get("/auth/me", async (req, reply) => {
    if (!req.user) return reply.code(401).send(fail("Not authenticated"));
    const { sessionId: _sessionId, ...user } = req.user;
    return ok(user);
  });
}
