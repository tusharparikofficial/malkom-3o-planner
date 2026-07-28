import type { FastifyInstance } from "fastify";
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  settingsPatchSchema,
  type PublicSettings,
  type SettingKey,
} from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { ok } from "../../lib/envelope.js";

async function loadSettings(): Promise<Record<SettingKey, unknown>> {
  const rows = await prisma.appSetting.findMany();
  const stored = new Map(rows.map((r) => [r.key, r.value as unknown]));
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [key, stored.has(key) ? stored.get(key) : SETTING_DEFAULTS[key]]),
  ) as Record<SettingKey, unknown>;
}

export async function settingsRoutes(app: FastifyInstance) {
  // Public: theme/config bootstrap. No auth so the login page is branded too.
  app.get("/settings/public", async () => {
    const settings = await loadSettings();
    const payload: PublicSettings = {
      settings,
      devLoginEnabled: env.isDev,
      ssoEnabled: env.samlEnabled,
    };
    return ok(payload);
  });

  app.get("/admin/settings", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async () => {
    return ok(await loadSettings());
  });

  app.patch("/admin/settings", { preHandler: [app.requireRole("SUPER_ADMIN")] }, async (req) => {
    const patch = settingsPatchSchema.parse(req.body);
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    await prisma.$transaction([
      ...entries.map(([key, value]) =>
        prisma.appSetting.upsert({
          where: { key },
          create: { key, value: value as never, updatedById: req.user!.id },
          update: { value: value as never, updatedById: req.user!.id },
        }),
      ),
      prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: "SETTING_UPDATED",
          meta: { keys: entries.map(([k]) => k) },
        },
      }),
    ]);
    return ok(await loadSettings());
  });
}
