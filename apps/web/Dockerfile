# ─── Development ─────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "run", "dev"]

# ─── Builder ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

RUN pnpm --filter web run build

# ─── Production ───────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
