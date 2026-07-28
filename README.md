# MALKOM 3.0 MVP Planner Portal

DB-driven planning portal for the MALKOM 3.0 MVP programme: business problem, approach &
considerations, solutions (blueprint / architecture / timeline), voice of customer — with
role-based feedback tracking and per-user analytics. See [PLANNING.md](./PLANNING.md).

## Stack

- **Web:** React 18 + Vite + TypeScript, Tailwind CSS (Capgemini theme, runtime CSS vars),
  shadcn-style components on Radix, Google Material Symbols
- **API:** Fastify + TypeScript, Prisma, PostgreSQL
- **Auth:** InstaSafe SSO (SAML 2.0) with JIT provisioning; dev fake login when SAML is unset

## Quick start

Uses the locally running Postgres on `localhost:5432` (a `malkom` role/database —
create once with `psql -U postgres -c "CREATE ROLE malkom LOGIN PASSWORD 'malkom' CREATEDB;" -c "CREATE DATABASE malkom OWNER malkom;"`).

```bash
cp .env.example .env          # adjust DATABASE_URL if your postgres differs
pnpm install
pnpm db:migrate               # prisma migrate dev
pnpm db:seed                  # seed pages + starter content
pnpm dev                      # api :3001 + web :5173
```

`docker-compose.yml` is optional — only for machines without a local Postgres
(it maps to host port 5434 to avoid clashing with an existing server).

Open http://localhost:5173 — in development you can sign in with any email via the dev
login. Emails in `SEED_SUPER_ADMIN_EMAILS` become Super Admins automatically.

## Workspace layout

| Path | Purpose |
|---|---|
| `apps/web` | React SPA |
| `apps/api` | Fastify API + Prisma schema/migrations/seed |
| `packages/shared` | Zod block-payload registry, roles, API types shared by both |
| `content/seed` | Versioned starter content loaded by the seed |
| `content/brand` | Brand source files (drop the official logo SVG/PNG here) |

## Configuration

Secrets & infrastructure → environment variables (`.env`, validated at startup — see
`.env.example`). Author-changeable values (brand colors, logo, site title, feature flags)
→ `AppSetting` table, editable in the UI at **/admin/settings**, applied without redeploy.

## Enabling real InstaSafe SSO

1. Ask the InstaSafe console admin to register MALKOM as a SAML SP — hand them the XML
   from `GET /api/v1/auth/metadata`.
2. Put the returned IdP SSO URL and signing certificate into `SAML_*` env vars.
3. Restart. When all `SAML_*` vars are present, real SSO replaces the dev login.
