# Hirely API

Minimal NestJS service. Single source of truth for HTTP routes, OpenAPI docs,
and Inngest functions.

> Repo-wide conventions for agents and humans live in
> [`AGENTS.md`](../../AGENTS.md). Read that first if you are new here.

## What's in here

- NestJS HTTP server (Express adapter)
- Postgres connection via Drizzle ORM
- `GET /api/health` — liveness + DB probe
- `GET /api/docs` — Swagger UI · `GET /api/docs-json` — raw OpenAPI 3 spec
- `POST /api/inngest` — Inngest webhook handler

## Layout

```
src/
  main.ts                # process entry — calls configureApp + listen
  bootstrap.ts           # shared wiring: prefix, body parser, Swagger, Inngest
  app.module.ts          # Root module (Config + Db + Health)
  db/
    db.module.ts         # @Global module exposing the "DATABASE" provider
    index.ts             # postgres + drizzle client
    schema.ts            # Drizzle schema (empty for now)
  health/
    health.module.ts
    health.controller.ts
    dto/
      health-response.dto.ts
  inngest/
    client.ts            # singleton Inngest client
    functions/           # one file per function, aggregated by index.ts
test/
  app.e2e-spec.ts        # supertest against a bootstrapped Nest app
  jest-e2e.json
```

## Setup

```bash
bun install                       # from repo root
cp .env.example .env              # fill DATABASE_URL etc.
```

## Run

```bash
bun run dev                       # watch mode
bun run start                     # one-shot
bun run build                     # compile to dist/
bun run start:prod                # node dist/main
```

Local Postgres (optional, if you don't already have one):

```bash
docker compose -p hirely up -d postgres
```

## Health check

```bash
curl http://localhost:4000/api/health
```

Returns something like:

```json
{
  "status": "ok",
  "db": "up",
  "uptime": 1.23,
  "timestamp": "2026-05-12T00:00:00.000Z"
}
```

`status` is `"ok"` when Postgres responds to `select 1`, otherwise `"degraded"`.

## API docs

- Swagger UI: <http://localhost:4000/api/docs>
- Raw OpenAPI: <http://localhost:4000/api/docs-json>

The JSON document is the contract used by generated clients and any agent
tooling (MCP servers, codegen, etc.). Every new controller route MUST carry
`@ApiTags`, `@ApiOperation` (with a stable `operationId`), and a typed
`@ApiOkResponse({ type: SomeDto })` so it shows up in the spec.

## Inngest (local dev)

```bash
NPM_CONFIG_CACHE=$(mktemp -d) npx --yes --ignore-scripts=false \
  inngest-cli@latest dev \
  --port 8288 \
  --no-discovery \
  -u http://localhost:4000/api/inngest
```

Then open <http://localhost:8288>. `INNGEST_DEV=1` (set in `.env.example`)
disables signing-key checks for local runs.

Add a new function:

1. `src/inngest/functions/<name>.ts` — `export const myFn = inngest.createFunction(...)`.
2. Re-export it from `src/inngest/functions/index.ts`.

## Tests

```bash
bun run test          # unit (src/**/*.spec.ts), mocks the DATABASE provider
bun run test:e2e      # e2e (test/**/*.e2e-spec.ts) via supertest
bun run test:cov      # coverage
```

CI runs lint + build + both test suites on every PR via
`.github/workflows/ci.yml`.

## Database

We use Drizzle Kit for migrations. Add tables to `src/db/schema.ts` then:

```bash
bun run db:generate    # produce SQL migration files
bun run db:migrate     # apply them
bun run db:push        # push schema directly (dev only)
bun run db:studio      # open Drizzle Studio
```

## Environment

| Variable              | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                                 |
| `PORT`                | HTTP port (default `4000`)                                 |
| `INNGEST_DEV`         | `1` to run Inngest in dev mode (skip signing-key check)    |
| `INNGEST_EVENT_KEY`   | Production: signs events sent to Inngest Cloud             |
| `INNGEST_SIGNING_KEY` | Production: verifies incoming webhook calls from Inngest   |
