# Build context = repo root (see docker-compose.prod.yml)
FROM node:22-alpine AS build

RUN apk add --no-cache openssl && npm install -g pnpm@9.15.9

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @malkom/web build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
