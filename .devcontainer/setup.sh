#!/usr/bin/env bash
# One-time codespace setup: env, deps, schema, seed content.
set -euo pipefail
cd "$(dirname "$0")/.."

npm install -g pnpm@9.15.9

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://malkom:malkom@db:5432/malkom|" .env
  sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env
fi

pnpm install
pnpm --filter @malkom/api db:deploy
pnpm --filter @malkom/api db:seed
echo "✅ MALKOM codespace ready"
