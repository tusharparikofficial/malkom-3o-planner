import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { randomBytes } from "node:crypto";
import { roleAtLeast, type Role } from "@malkom/shared";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { fail } from "../lib/envelope.js";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (min: Role) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    createSession: (userId: string, userAgent: string | undefined, reply: FastifyReply) => Promise<void>;
    destroySession: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const SESSION_COOKIE = "malkom_sid";

async function sessionPlugin(app: FastifyInstance) {
  app.decorateRequest("user", null);

  app.addHook("onRequest", async (req) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (!raw) return;
    const unsigned = req.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return;

    const session = await prisma.session.findUnique({
      where: { id: unsigned.value },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return;

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.id,
    };
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      await reply.code(401).send(fail("Not authenticated"));
    }
  });

  app.decorate("requireRole", (min: Role) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) {
        await reply.code(401).send(fail("Not authenticated"));
        return;
      }
      if (!roleAtLeast(req.user.role, min)) {
        await reply.code(403).send(fail("Insufficient permissions"));
      }
    };
  });

  app.decorate(
    "createSession",
    async (userId: string, userAgent: string | undefined, reply: FastifyReply) => {
      const session = await prisma.session.create({
        data: {
          id: randomBytes(24).toString("hex"),
          userId,
          userAgent: userAgent ?? null,
          expiresAt: new Date(Date.now() + env.SESSION_TTL_HOURS * 3600_000),
        },
      });
      reply.setCookie(SESSION_COOKIE, session.id, {
        path: "/",
        httpOnly: true,
        secure: env.isProd,
        sameSite: "lax",
        signed: true,
        maxAge: env.SESSION_TTL_HOURS * 3600,
      });
    },
  );

  app.decorate("destroySession", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.user) {
      await prisma.session.update({
        where: { id: req.user.sessionId },
        data: { revokedAt: new Date() },
      });
    }
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
  });
}

export default fp(sessionPlugin, { name: "session" });
