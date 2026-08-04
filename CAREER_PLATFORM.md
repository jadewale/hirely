# Career Platform

A reverse-recruiting marketplace (candidates ↔ assistants ↔ admins) built as a
second product inside this Turborepo/bun monorepo, alongside `hirely`. It reuses
the repo's toolchain and deployment pattern (bun, Turborepo, NestJS, Next.js,
Drizzle, ECS/Fargate + Vercel) but ships its own apps, packages, and pipeline.

> **Status:** RR-001 (monorepo skeleton). Auth, database schema, and product
> features land in later tickets. See the build brief for the ticket backlog.

## Workspaces

| Path | Name | What it is |
| --- | --- | --- |
| `apps/career-api` | `career-api` | NestJS API (health endpoint + Swagger today). |
| `apps/career-web` | `career-web` | Next.js App Router web client. |
| `packages/career-config` | `@career/config` | Shared tsconfig + ESLint presets (consumed by the apps). |
| `packages/career-contracts` | `@career/contracts` | Zod API contracts shared by api + web (RR-004). |
| `packages/career-db` | `@career/db` | Drizzle client + schema (RR-003). API-only — the web app must never import it. |
| `packages/career-testing` | `@career/testing` | Shared test helpers/fixtures. |

All `career-*` workspaces are namespaced so they never collide with `hirely`'s
`apps/api` / `apps/web`.

## Prerequisites

- [Bun](https://bun.sh) `1.3.1` (pinned in root `package.json` → `packageManager`)

## Setup

```bash
# from the repo root — installs every workspace (hirely + career)
bun install

# copy env templates
cp apps/career-api/.env.example apps/career-api/.env
cp apps/career-web/.env.example apps/career-web/.env.local
```

Default local ports (chosen to not collide with hirely's `4000` / `3000`):

- `career-api` → `http://localhost:4100` (routes under `/api`, health at `/api/health`, OpenAPI at `/api/docs`)
- `career-web` → `http://localhost:3100`

## Run

```bash
# run the API and web client together (filtered to the career apps)
bunx turbo run dev --filter=career-api --filter=career-web

# or individually
bun run --cwd apps/career-api dev
bun run --cwd apps/career-web dev
```

## Quality gates

These mirror what CI enforces (`.github/workflows/ci.yml`, jobs `career-api` /
`career-web`):

```bash
# scoped to the career workspaces
bunx turbo run check-types --filter=career-api --filter=career-web \
  --filter=@career/contracts --filter=@career/db --filter=@career/testing
bunx turbo run lint  --filter=career-api --filter=career-web
bunx turbo run build --filter=career-api --filter=career-web

# API tests
bun run --cwd apps/career-api test
bun run --cwd apps/career-api test:e2e
```

## Conventions

Follow the repo-wide rules in `AGENTS.md` (Conventional Commits, bun-only,
Swagger DTOs on every endpoint, MVVM boundaries in web). The web app talks to
the API only over HTTP — it has no database dependency by construction.
