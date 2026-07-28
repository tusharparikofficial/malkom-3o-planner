import { z } from "zod";

// Load env via Node's native loader — no dotenv dep. Local apps/api/.env first
// (wins — loadEnvFile never overrides already-set vars), then repo root .env
// fills the gaps.
for (const path of [".env", "../../.env"]) {
  try {
    process.loadEnvFile(path);
  } catch {
    /* file not found — skip */
  }
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:3001"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  SEED_SUPER_ADMIN_EMAILS: z.string().default(""),
  SAML_IDP_SSO_URL: z.string().url().optional(),
  SAML_IDP_ENTITY_ID: z.string().optional(),
  SAML_IDP_CERT: z.string().optional(),
  SAML_SP_ENTITY_ID: z.string().optional(),
  SAML_SLO_URL: z.string().url().optional(),
  // Named-user dev login. Defaults to NODE_ENV=development only; may be
  // explicitly enabled in production for the pilot until InstaSafe SSO is
  // registered (still no anonymous access — every login is a tracked user).
  DEV_LOGIN_ENABLED: z.enum(["true", "false"]).optional(),
  // Secure cookies default on in production; set false while serving plain
  // HTTP (no TLS yet), otherwise the session cookie is never sent.
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  UPLOADS_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  // eslint-disable-next-line no-console
  console.error(`❌ Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const base = parsed.data;

export const env = {
  ...base,
  isDev: base.NODE_ENV === "development",
  isProd: base.NODE_ENV === "production",
  devLoginEnabled:
    base.DEV_LOGIN_ENABLED !== undefined
      ? base.DEV_LOGIN_ENABLED === "true"
      : base.NODE_ENV === "development",
  cookieSecure:
    base.COOKIE_SECURE !== undefined
      ? base.COOKIE_SECURE === "true"
      : base.NODE_ENV === "production",
  superAdminEmails: base.SEED_SUPER_ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  samlEnabled: Boolean(
    base.SAML_IDP_SSO_URL && base.SAML_IDP_ENTITY_ID && base.SAML_IDP_CERT && base.SAML_SP_ENTITY_ID,
  ),
} as const;

export type Env = typeof env;
