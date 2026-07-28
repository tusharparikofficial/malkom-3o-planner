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

## Windows setup (no Docker)

Prerequisites: Node ≥ 20 (`node -v`), git, and PostgreSQL for Windows
(installer: https://www.postgresql.org/download/windows/ — remember the
`postgres` superuser password you choose; default port 5432).

```powershell
# 1. pnpm
npm install -g pnpm

# 2. Clone (private repo — sign in when prompted, or use `gh auth login` first)
cd C:\apps
git clone https://github.com/tusharparikofficial/malkom-3o-planner.git
cd malkom-3o-planner

# 3. Create the database (psql lives in PostgreSQL's bin, e.g. C:\Program Files\PostgreSQL\17\bin)
#    Set PGPASSWORD first so psql doesn't prompt (use YOUR postgres superuser password):
set PGPASSWORD=<your-postgres-password>
psql -U postgres -c "CREATE ROLE malkom LOGIN PASSWORD 'malkom' CREATEDB;"
psql -U postgres -c "CREATE DATABASE malkom OWNER malkom;"

# 4. Environment
copy .env.example .env
# generate a session secret and paste it into .env as SESSION_SECRET=
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. Install, migrate, seed, run
pnpm install                  # also runs `prisma generate` via postinstall
pnpm db:migrate
pnpm db:seed
pnpm dev
```

If you see `@prisma/client did not initialize yet`, run `pnpm --filter @malkom/api db:generate`
once (only needed on installs made before the postinstall hook existed).

Open http://localhost:5173 and sign in with the dev login (any email;
addresses in `SEED_SUPER_ADMIN_EMAILS` become Super Admins automatically).

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
