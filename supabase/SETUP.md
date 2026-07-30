# Making the GitHub Pages portal dynamic with Supabase

The static Pages site becomes the full portal (login, feedback, authoring,
analytics, notifications) once a Supabase project is wired in. Total setup is
~15 minutes of clicking; no servers involved.

## 1. Create the project (2 min)

1. https://supabase.com → sign in with GitHub → **New project** (free tier).
2. Name `malkom`, region `Mumbai (ap-south-1)`, set a database password (save it).

## 2. Run the migrations (3 min)

Dashboard → **SQL Editor** → run these three files from `supabase/migrations/`
in order (paste contents → Run):

1. `0001_schema.sql` — all 22 tables (exact copy of the app schema)
2. `0002_auth_api.sql` — auth provisioning + the entire API as database functions
3. `0003_seed.sql` — the current portal content (pages, approaches, timeline, diagrams)

## 3. Point the Pages build at the project (3 min)

Project **Settings → API**: copy the *Project URL* and the *anon public* key.

GitHub repo → **Settings → Secrets and variables → Actions → Variables** tab →
add two repository variables:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the anon key |

Push any commit (or re-run the workflow). The Pages site now builds in dynamic
mode — a login screen instead of the read-only snapshot.

## 4. Auth configuration (2 min)

Supabase Dashboard → **Authentication → URL Configuration**:

- Site URL: `https://tusharparikofficial.github.io/malkom-3o-planner/`
- Redirect URLs: add the same URL.

Email sign-in works immediately. Anyone signing in with an email listed in the
`auth.superAdminEmails` row of `AppSetting` (tushar.parik@wns.com, u139289@wns.com,
tushar.parik@gmail.com — edit via SQL editor) becomes SUPER_ADMIN automatically;
everyone else starts as VIEWER and can be promoted in **Administration → Users**.

Optional: Authentication → Sign In/Up → disable "Confirm email" for a
frictionless pilot (otherwise new users must click a confirmation email).

## 5. Microsoft SSO — same pattern as the quantum shipping portal (needs Azure)

Supabase Dashboard → **Authentication → Providers → Azure**: enable, then fill
in a WNS Entra app registration's *Application (client) ID* and *secret*.

The Entra app needs this redirect URI (ask whoever owns the quantum portal's
registration to add it, or create a new single-tenant registration):

```
https://<project-ref>.supabase.co/auth/v1/callback
```

Until this is configured the "Sign in with Microsoft" button will error —
email/password keeps working regardless.

## 6. AI diagram generator (optional, 3 min, needs the Supabase CLI)

```bash
npm i -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy generate-diagram
supabase secrets set DEEPSEEK_API_KEY=sk-... DEEPSEEK_MODEL=deepseek-v4-flash
```

Everything else works without this — only the "Generate diagram" button needs it.

## Local development against Supabase (optional)

Create `apps/web/.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

`pnpm dev:web` then runs the local UI against the cloud backend. Leave those
unset to keep using the local Fastify + Postgres stack.

## How it works

- The browser talks straight to Supabase: auth via Supabase Auth, data via
  `api_*` Postgres functions (`supabase/migrations/0002_auth_api.sql`) that
  mirror the original Fastify routes — same role checks, same JSON shapes.
- Clients have **no direct table access**; every operation goes through those
  SECURITY DEFINER functions.
- New sign-ins are provisioned by a trigger on `auth.users` (VIEWER by
  default, SUPER_ADMIN if allow-listed).
- The DeepSeek key lives in Edge Function secrets, never in the browser.
- With the repo variables unset, the build falls back to the read-only
  snapshot — the pipeline can never break the site.
