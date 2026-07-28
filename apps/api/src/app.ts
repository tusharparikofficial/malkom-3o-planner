import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import sessionPlugin from "./plugins/session.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import { authRoutes } from "./modules/auth/routes.js";
import { pagesRoutes } from "./modules/pages/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";
import { feedbackRoutes } from "./modules/feedback/routes.js";
import { commentsRoutes } from "./modules/comments/routes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { notificationsRoutes } from "./modules/notifications/routes.js";
import { adminUsersRoutes } from "./modules/admin/users-routes.js";
import { adminBlocksRoutes } from "./modules/admin/blocks-routes.js";
import { adminApproachesRoutes } from "./modules/admin/approaches-routes.js";
import { adminTimelineRoutes } from "./modules/admin/timeline-routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.isDev ? { transport: { target: "pino-pretty" } } : {}),
    },
  });

  await app.register(helmet, { contentSecurityPolicy: env.isProd });
  await app.register(cors, {
    origin: env.isDev ? true : env.APP_BASE_URL,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(errorHandlerPlugin);
  await app.register(sessionPlugin);

  // sendBeacon posts text/plain — analytics ingest parses it itself.
  app.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) => {
    done(null, body);
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(
    async (v1) => {
      await authRoutes(v1);
      await settingsRoutes(v1);
      await pagesRoutes(v1);
      await feedbackRoutes(v1);
      await commentsRoutes(v1);
      await analyticsRoutes(v1);
      await notificationsRoutes(v1);
      await adminUsersRoutes(v1);
      await adminBlocksRoutes(v1);
      await adminApproachesRoutes(v1);
      await adminTimelineRoutes(v1);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
