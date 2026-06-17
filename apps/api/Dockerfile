# ─── Development ─────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache openssl postgresql-client

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN cd apps/api && ./node_modules/.bin/prisma generate

WORKDIR /app/apps/api

CMD ["pnpm", "run", "start:dev"]

# ─── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

RUN cd apps/api && ./node_modules/.bin/prisma generate

RUN pnpm --filter api run build

# ─── Production ───────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/src/main"]
