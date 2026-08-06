# syntax=docker/dockerfile:1.7
#
# career-api image. Build context is the monorepo ROOT (see buildspec.yml).
# Mirrors apps/api/Dockerfile. The builder copies EVERY workspace's
# package.json so `bun install --frozen-lockfile` resolves the full workspace
# graph recorded in bun.lock -- omitting any workspace makes the frozen
# install fail with "lockfile had changes".
ARG BUN_BUILDER_IMAGE=oven/bun:1.3.1
ARG BUN_RUNNER_IMAGE=oven/bun:1.3.1-slim

# ---- builder ----
FROM ${BUN_BUILDER_IMAGE} AS builder
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/career-api/package.json apps/career-api/package.json
COPY apps/career-web/package.json apps/career-web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/career-config/package.json packages/career-config/package.json
COPY packages/career-contracts/package.json packages/career-contracts/package.json
COPY packages/career-db/package.json packages/career-db/package.json
COPY packages/career-testing/package.json packages/career-testing/package.json
RUN bun install --frozen-lockfile --backend=copyfile
# career-api's tsconfig extends @career/config, and it imports @career/db at
# runtime, so both packages must be present for `nest build` to resolve them.
COPY packages/career-config packages/career-config
COPY packages/career-db packages/career-db
COPY apps/career-api apps/career-api
RUN bun run --cwd apps/career-api build

# ---- runner ----
FROM ${BUN_RUNNER_IMAGE} AS runner
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --no-create-home appuser
WORKDIR /app
ENV NODE_ENV=production PORT=4100
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/career-api/package.json ./apps/career-api/package.json
COPY --from=builder --chown=appuser:appgroup /app/apps/career-api/node_modules ./apps/career-api/node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/career-api/dist ./apps/career-api/dist
# @career/db is a runtime dependency (bun runs its TS source), and the workspace
# symlink in node_modules points here — so ship the package, including its
# drizzle/ migrations folder.
COPY --from=builder --chown=appuser:appgroup /app/packages/career-db ./packages/career-db
WORKDIR /app/apps/career-api
USER appuser
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:4100/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["bun", "run", "dist/main.js"]
