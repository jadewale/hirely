# Hirely API

Minimal NestJS service. Single source of truth for HTTP routes, OpenAPI docs,
and Inngest functions.

> Repo-wide conventions for agents and humans live in
> [`AGENTS.md`](../../AGENTS.md). Read that first if you are new here.

## What's in here

- NestJS HTTP server (Express adapter)
- Postgres connection via Drizzle ORM (auto-migrating at boot)
- Better Auth at `/api/auth/*` — email/password + Google OAuth, with verify
  / password-reset / welcome emails wired through `EmailProvider`
- `GET /api/health` — liveness + DB probe
- `GET /api/docs` — Swagger UI · `GET /api/docs-json` — raw OpenAPI 3 spec
- `POST /api/inngest` — Inngest webhook handler
- `POST /api/mcp` — Model Context Protocol endpoint (Streamable HTTP)

## Layout

```
src/
  main.ts                # process entry — runs migrations, calls configureApp, listens
  bootstrap.ts           # shared wiring: prefix, shutdown hooks, Swagger, Inngest
  app.module.ts          # Root module (Config, Auth, Db, Http, Email, Health, Mcp)
  db/
    db.module.ts         # @Global "DATABASE" provider; drains pool on shutdown
    index.ts             # postgres-js pool + drizzle client (env-tuned)
    migrator.ts          # startup migrator — runs before app.listen()
    schema/              # one file per domain + barrel index.ts
      auth.ts            # Better Auth tables (CLI-owned, do not hand-edit)
  email/
    email.module.ts      # Nest provider for EMAIL_PROVIDER
    email.factory.ts     # plain factory shared with src/lib/auth.ts
    providers/           # console | resend | ses
  health/
    health.module.ts
    health.controller.ts
    health.service.ts    # business logic, shared by controller + MCP tool
    dto/
      health-response.dto.ts
  http/
    http.module.ts       # Nest provider for HTTP_CLIENT
    http.factory.ts      # plain factory shared with src/lib/auth.ts
    clients/             # fetch | axios
  inngest/
    client.ts            # singleton Inngest client
    functions/           # one file per function, aggregated by index.ts
  lib/
    auth.ts              # Better Auth instance — source of truth for /api/auth/*
    auth-emails.ts       # HTML+text templates for verify / reset / welcome
  mcp/
    mcp.module.ts
    mcp.service.ts       # builds an McpServer with all registered tools
    mcp.controller.ts    # POST/GET/DELETE /api/mcp -> Streamable HTTP transport
test/
  app.e2e-spec.ts        # supertest against a bootstrapped Nest app
  auth.e2e-spec.ts       # sign-up → sign-in → session, real Postgres (TEST_DATABASE_URL)
  mcp.e2e-spec.ts        # /api/mcp Streamable HTTP smoke
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

The JSON document is the contract used by generated clients. Every new
controller route MUST carry `@ApiTags`, `@ApiOperation` (with a stable
`operationId`), and a typed `@ApiOkResponse({ type: SomeDto })` so it shows
up in the spec.

## MCP

Endpoint: `POST /api/mcp` (Model Context Protocol over Streamable HTTP,
stateless — every request creates a fresh server + transport pair).

Currently registered tools (see `src/mcp/mcp.service.ts`):

- `getHealth` — wraps `HealthService.check()`; returns structured content.
- `sendInngestEvent` — fires an Inngest event by name with optional payload.

Adding a tool: register it inside `McpService.createServer()` next to the
others. Tool handlers should call the matching NestJS service, never
re-implement the logic. The contract is: **one service, two surfaces
(HTTP + MCP).**

Smoke-test from the CLI with the MCP inspector:

```bash
npx --yes @modelcontextprotocol/inspector \
  --cli http://localhost:4000/api/mcp \
  --method tools/list
```

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

We use Drizzle Kit for migrations. Schema lives in `src/db/schema/<domain>.ts`,
re-exported from `schema/index.ts`. `src/db/schema/auth.ts` is generated by
the Better Auth CLI — do not hand-edit it.

```bash
bun run db:generate        # produce SQL migration files for your domain schemas
bun run db:auth-generate   # regenerate src/db/schema/auth.ts from src/lib/auth.ts
bun run db:migrate         # apply migrations
bun run db:push            # push schema directly (dev only)
bun run db:studio          # open Drizzle Studio
```

Migrations apply automatically at container start via `runMigrations()` in
`main.ts` — state is tracked in the `__drizzle_migrations` table, so manual
`db:migrate` is only needed when iterating locally.

## Auth

Better Auth (`@thallesp/nestjs-better-auth`) is mounted at `/api/auth/*`.
Sign-up sends a verification email; password reset and a welcome email are
also wired through `EmailProvider`. Configuration lives in `src/lib/auth.ts`;
email templates live in `src/lib/auth-emails.ts`.

A global guard requires a session on every route. Endpoints that must stay
public carry `@AllowAnonymous()` from `@thallesp/nestjs-better-auth` —
see `health.controller.ts` and `mcp.controller.ts`.

Auth flows are user-initiated, so they are NOT exposed as MCP tools —
their session cookies cannot survive MCP's stateless transport.

Smoke-test from the CLI:

```bash
curl -i -X POST http://localhost:4000/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"pa55word!!","name":"You"}'
```

## Environment

| Variable               | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string                                        |
| `PG_POOL_MAX`          | Per-process connection pool size (default `10`)                   |
| `PG_IDLE_TIMEOUT`      | Seconds before idle pool connections close (default `30`)         |
| `PG_CONNECT_TIMEOUT`   | Seconds to wait for a new connection (default `10`)               |
| `PG_PREPARE`           | Set `0` if running behind PgBouncer in transaction-pooling mode   |
| `PORT`                 | HTTP port (default `4000`)                                        |
| `BETTER_AUTH_SECRET`   | Required. `openssl rand -base64 48`. Rotating invalidates sessions |
| `BETTER_AUTH_URL`      | API base URL — must match Google OAuth Authorized redirect URIs   |
| `FRONTEND_URL`         | Trusted origin for the SPA; redirect target after OAuth           |
| `GOOGLE_CLIENT_ID`     | Optional. Unset / `unset` disables the Google provider            |
| `GOOGLE_CLIENT_SECRET` | Optional. Paired with the client ID                               |
| `EMAIL_PROVIDER`       | `resend` \| `ses` \| `console` (default `console`)                |
| `EMAIL_FROM`           | Verified sender, e.g. `"Hirely <onboarding@hirely.io>"`           |
| `RESEND_API_KEY`       | Required when `EMAIL_PROVIDER=resend`                             |
| `HTTP_CLIENT`          | `fetch` \| `axios` (default `fetch`)                              |
| `INNGEST_DEV`          | `1` to run Inngest in dev mode (skip signing-key check)           |
| `INNGEST_EVENT_KEY`    | Production: signs events sent to Inngest Cloud                    |
| `INNGEST_SIGNING_KEY`  | Production: verifies incoming webhook calls from Inngest          |
| `TEST_DATABASE_URL`    | When set, `auth.e2e-spec.ts` runs against this Postgres; else skipped |
