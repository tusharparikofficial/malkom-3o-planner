# Build context = repo root (see docker-compose.prod.yml)
FROM node:22-alpine

RUN apk add --no-cache openssl && npm install -g pnpm@9.15.9

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter @malkom/api --filter @malkom/shared

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Apply pending migrations, then start. Config comes from container env.
CMD ["sh", "-c", "pnpm --filter @malkom/api db:deploy && exec pnpm --filter @malkom/api start"]
