# syntax=docker/dockerfile:1.7
# Build context: monorepo root
#   docker build -f apps/api/Dockerfile -t hirely-api .
#
# Base image overrides (used by CI to point at an ECR mirror that
# isn't rate-limited like anonymous Docker Hub pulls from CodeBuild
# shared egress IPs). Default values keep local builds simple.

ARG BUN_BUILDER_IMAGE=oven/bun:1.3.1
ARG BUN_RUNNER_IMAGE=oven/bun:1.3.1-slim

# ---- builder ----
FROM ${BUN_BUILDER_IMAGE} AS builder

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
# The career-* workspaces share this monorepo's bun.lock, so their manifests
# must be present here too or `--frozen-lockfile` resolves a smaller graph than
# the lockfile records and fails with "lockfile had changes".
COPY apps/career-api/package.json apps/career-api/package.json
COPY apps/career-web/package.json apps/career-web/package.json
COPY packages/career-config/package.json packages/career-config/package.json
COPY packages/career-contracts/package.json packages/career-contracts/package.json
COPY packages/career-db/package.json packages/career-db/package.json
COPY packages/career-testing/package.json packages/career-testing/package.json

RUN bun install --frozen-lockfile --backend=copyfile

# Copy API source and build (nest build -> apps/api/dist)
COPY apps/api apps/api
RUN bun run --cwd apps/api build

# ---- runner ----
FROM ${BUN_RUNNER_IMAGE} AS runner

RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

# Bun's workspace install keeps deps under each workspace package, so copy both
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=appuser:appgroup /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:appgroup /app/apps/api/drizzle ./apps/api/drizzle

WORKDIR /app/apps/api

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://localhost:4000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "run", "dist/main.js"]
