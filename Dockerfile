# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-only-secret-build-only-secret \
    APP_URL=http://localhost:3000
RUN pnpm build && pnpm build:migrate

# Optional one-shot demo seed container. Never used by the production image.
FROM base AS seeder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV MEDIA_ROOT=/data/media
CMD ["pnpm", "db:seed"]

FROM node:${NODE_VERSION}-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --chown=nextjs:nodejs docker/migrate.bundle.cjs ./docker/migrate.cjs
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x docker/entrypoint.sh \
    && mkdir -p /data/media \
    && chown -R nextjs:nodejs /data/media /app/public /app/.next \
    && chmod -R a+rX /app/public /app/.next

USER nextjs
EXPOSE 3000
VOLUME ["/data/media"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
