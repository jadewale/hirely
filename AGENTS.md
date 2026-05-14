# Agents Guide

Quickstart for AI coding agents (Cursor, Claude Code, Codex, etc.) and humans
new to the repo. Keep this file short and current — it is the source of truth
for "how do I work in this codebase".

## What this repo is

`hirely` is a Bun monorepo containing:

- `apps/api` — minimal NestJS service (Postgres via Drizzle, Inngest for
  async jobs). Exposes a public HTTP API documented via OpenAPI.
- `apps/web` — Next.js client (placeholder; not the focus right now).
- `packages/shared` — code shared between apps.
- `packages/terraform-aws` — infrastructure as code for the AWS deploy.
- `packages/eslint-config`, `packages/typescript-config` — shared tooling.

## Stack at a glance

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Runtime / PM | Bun (workspaces). **Do not run `npm install`** at the root. |
| API          | NestJS 11 + Express adapter                                 |
| DB           | Postgres + Drizzle ORM                                      |
| Jobs         | Inngest (HTTP handler mounted at `/api/inngest`)            |
| Docs         | `@nestjs/swagger` — UI at `/api/docs`, raw at `/api/docs-json` |
| MCP          | `@modelcontextprotocol/sdk` mounted at `/api/mcp` (Streamable HTTP) |
| Auth         | Better Auth (email/password + Google) via `@thallesp/nestjs-better-auth` |
| HTTP         | `HttpClient` adapter — Fetch (default) / Axios (stub) behind one interface |
| Email        | `EmailProvider` adapter — SES (default) / Resend / Console behind one interface |
| Tests        | Jest (unit + e2e) via `@swc/jest` (handles ESM-only deps)   |
| Container    | Multi-stage Bun image; base images mirrored to ECR          |
| Infra        | Terraform → ECS Fargate + RDS + ALB + ACM + Route53         |
| CI/CD        | CodePipeline (V2) → CodeBuild Build → CodeBuild Deploy      |

## Local dev

```bash
bun install                              # from repo root
cp apps/api/.env.example apps/api/.env   # fill DATABASE_URL etc.
docker compose -f apps/api/docker-compose.yml -p hirely up -d postgres
cd apps/api && bun run dev               # starts on :4000
```

Useful endpoints once running:

- `GET  /api/health` — liveness + DB probe
- `GET  /api/docs` — Swagger UI
- `GET  /api/docs-json` — raw OpenAPI 3 document
- `POST /api/inngest` — Inngest webhook target (returns 401 without signature)
- `POST /api/mcp` — Model Context Protocol endpoint (Streamable HTTP, stateless)
- `*    /api/auth/*` — Better Auth routes (sign-up, sign-in, session, OAuth callback)

### Inngest dev server

```bash
# In a second terminal:
NPM_CONFIG_CACHE=$(mktemp -d) npx --yes --ignore-scripts=false \
  inngest-cli@latest dev \
  --port 8288 \
  --no-discovery \
  -u http://localhost:4000/api/inngest
```

Then open `http://localhost:8288`. The API auto-registers its functions on
boot because `INNGEST_DEV=1` is set in `.env.example`.

## Quality gates

Run from `apps/api`:

```bash
bun run build       # nest build -> dist/
bun run lint        # eslint --fix
bun run test        # unit tests (jest, src/**/*.spec.ts)
bun run test:e2e    # supertest against bootstrapped Nest app
```

All four must pass before merging. CI enforces this — see
`.github/workflows/ci.yml`.

## HTTP

All outbound HTTP requests go through `HttpClient` (injection token
`HTTP_CLIENT`) in `apps/api/src/http/`. Never call `fetch` or `axios`
directly from feature code — inject the client:

```typescript
constructor(@Inject(HTTP_CLIENT) private http: HttpClient) {}
```

Pick the implementation with `HTTP_CLIENT=fetch|axios`. `fetch` is the
default (uses `globalThis.fetch`, no extra deps). The `axios` adapter is
a stub that throws at boot — `bun add axios` and replace the stub body
before switching to it.

## Email

All transactional email goes through `EmailProvider` (injection token
`EMAIL_PROVIDER`) in `apps/api/src/email/`. Never call SES, Resend, or
fetch an email API directly from feature code — inject the provider:

```typescript
constructor(@Inject(EMAIL_PROVIDER) private email: EmailProvider) {}
```

Pick the implementation with `EMAIL_PROVIDER=ses|resend|console`. `console`
is the default for local dev (logs to stdout). `ses` is the default in
prod (signs requests via the ECS task role — no API key in SSM). `resend`
is kept around as a swap-in fallback; the API key still lives in SSM so
flipping back is a one-line change.

### SES (production)

- Identity, DKIM CNAMEs, configuration set, and bounce/complaint SNS
  topic are owned by Terraform in `packages/terraform-aws/ses.tf`.
- The ECS task role has `ses:SendEmail` scoped to the identity AND the
  configuration set (`packages/terraform-aws/ses.tf` → `aws_iam_role_policy.ecs_task_ses`).
- `SES_CONFIGURATION_SET` env var routes every send through the config
  set so bounce/complaint events flow to `aws_sns_topic.ses_events`.
  Subscribe a Lambda/SQS consumer to that topic when you build a real
  bounce handler.
- A fresh AWS account lands in the SES sandbox (200/day, verified
  recipients only). After the first `terraform apply` you must click
  "Request production access" in the SES console — this step is **not**
  Terraformable.

Better Auth's verify / reset callbacks call `getEmailProvider()` (a
memoized singleton from `src/email/email.factory.ts`) so they reuse the
same provider as the rest of the app. Inngest functions use the same
helper. The welcome / nudge emails are NOT sent from Better Auth — see
[Onboarding emails](#onboarding-emails-inngest) below.

## Auth

Better Auth lives at `/api/auth/*` and is wired in via
`@thallesp/nestjs-better-auth`. Its instance and email-callback wiring
are in `apps/api/src/lib/auth.ts`; transactional templates are in
`apps/api/src/lib/auth-emails.ts`. The Drizzle tables Better Auth needs
(`user`, `session`, `account`, `verification`) live in
`apps/api/src/db/schema/auth.ts` and are CLI-generated — see the
[Database](#database-drizzle) section.

### Rules

- **Anonymous endpoints**: a global guard requires a session on every
  route. Endpoints that must be reachable without auth (`/api/health`,
  `/api/mcp`, Inngest's webhook) carry `@AllowAnonymous()` from
  `@thallesp/nestjs-better-auth`. Forgetting this on a new public route
  gives a confusing 401 in CI — check the controller first.
- **Body parsing**: `main.ts` boots Nest with `bodyParser: false`. The
  `AuthModule` reinstalls JSON + urlencoded parsers for non-auth routes
  AND keeps the raw body for `/api/auth/*` so Better Auth can read it.
  Do NOT call `app.useBodyParser('json')` from `bootstrap.ts` or
  `main.ts` — it shadows that wiring.
- **Required env vars**: `BETTER_AUTH_SECRET` (rotate = invalidate every
  session) and `BETTER_AUTH_URL` (must match an Authorized redirect URI
  in Google OAuth). `GOOGLE_CLIENT_ID`/`SECRET` are optional — when unset
  Better Auth silently drops the Google provider so local dev boots
  cleanly.
- **No MCP parity for auth**: sign-up, sign-in, password reset, and the
  OAuth callback are user-initiated and depend on session cookies that
  MCP's stateless Streamable HTTP transport cannot carry. The "one
  service, two surfaces" rule still applies to your own domain features,
  just not to Better Auth's surface.
- **MCP parity for onboarding events**: the events that cancel onboarding
  nudges (`integrations/inbox.connected`, `resumes/uploaded`) are
  exposed as `markInboxConnected` / `markResumeUploaded` tools in
  `src/mcp/mcp.service.ts`. `user/created` is intentionally NOT exposed
  — only Better Auth's `databaseHooks.user.create.after` may fire it.

## Onboarding emails (Inngest)

Welcome + nudge emails go through Inngest, not Better Auth. The auth
hook's only job is to fire one `user/created` event; everything else —
welcome, "connect your inbox" nudge, "upload your resume" nudge — runs
as a separate Inngest function. This keeps sign-up fast, retries
transparent, and the nudge cancellation logic declarative.

### Event catalog (`apps/api/src/inngest/events.ts`)

The Inngest client uses typed event schemas so `inngest.send(...)` and
`cancelOn` predicates are checked at compile time. Current events:

| Event                            | Producer                                          | Consumers                                                      |
| -------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `user/created`                   | `lib/auth.ts` — `databaseHooks.user.create.after` | `onboarding-welcome`, `onboarding-inbox-nudge`, `onboarding-resume-nudge` |
| `integrations/inbox.connected`   | Integrations feature (TBD)                        | Cancels `onboarding-inbox-nudge`                               |
| `resumes/uploaded`               | Resumes feature (TBD)                             | Cancels `onboarding-resume-nudge`                              |

### The `cancelOn` pattern

The two nudge functions each `step.sleep('5d')` and then send their
email. They DON'T query the DB to check "did the user do X?" — instead
they declare `cancelOn` and let Inngest cancel the run when the matching
event arrives. The expression `async.data.userId == event.data.userId`
scopes cancellation to the right user.

This means: **every action that should suppress a nudge MUST emit an
event matching the cancel predicate.** When the integrations feature
ships, the inbox-connect handler MUST `await inngest.send({ name:
'integrations/inbox.connected', data: { userId, provider } })`. Same
for resume upload. If the event isn't emitted, the nudge will fire even
though the user already completed the action.

### Adding a new nudge

1. Add the cancel-event to `apps/api/src/inngest/events.ts` (include
   `data.userId` so `cancelOn` can match).
2. Add an `ONBOARDING_<NAME>_NUDGE` constant to
   `apps/api/src/inngest/functions/onboarding/consts.ts` with `id`,
   `name`, and `steps.{sleep,send}` keys.
3. Create `apps/api/src/inngest/functions/onboarding/<name>-nudge.ts`
   following the inbox/resume pattern (`step.sleep` → `step.run`),
   referencing the consts and `MATCH_USER_ID_EXPR`.
4. Re-export the new function from
   `apps/api/src/inngest/functions/onboarding/index.ts`, then add it to
   the registry array in `apps/api/src/inngest/functions/index.ts`.
5. Add an email template to `apps/api/src/lib/onboarding-emails.ts`.
6. Update the feature code that completes the action to emit the
   cancel-event.

Tune the delay locally with `ONBOARDING_NUDGE_DELAY=30s` to exercise
the path without waiting 5 days.

## Database (Drizzle)

Schema lives in `apps/api/src/db/schema/<domain>.ts`, one file per domain,
re-exported from `schema/index.ts`. `drizzle.config.ts` globs the folder so
new domain files are picked up with zero config.

```
apps/api/src/db/
├── index.ts                  # postgres-js pool + Drizzle client + Database type
├── db.module.ts              # @Global module exposing "DATABASE" + closes pool on shutdown
├── migrator.ts               # startup migrator; runs from main.ts before listen()
└── schema/
    ├── index.ts              # barrel — `export * from './<domain>'` per new file
    └── auth.ts               # Better Auth tables (CLI-owned, do not hand-edit)
```

### Pool tuning

`postgres-js` maintains a connection pool per process. We expose its
key knobs via env vars so they can be tuned per-environment without a
code deploy. Total RDS connections in use = `PG_POOL_MAX * ECS tasks`,
so size this against your RDS instance class (e.g. `db.t3.micro` ≈ 85
max).

| Env var              | Default | Notes                                                     |
| -------------------- | ------- | --------------------------------------------------------- |
| `PG_POOL_MAX`        | `10`    | Max simultaneous connections per process                  |
| `PG_IDLE_TIMEOUT`    | `30`    | Seconds before an idle pooled connection closes           |
| `PG_CONNECT_TIMEOUT` | `10`    | Seconds to wait acquiring a new connection                |
| `PG_PREPARE`         | (on)    | Set `0` if running behind PgBouncer in transaction-pooling mode |

The pool drains cleanly on SIGTERM (ECS) and on `app.close()` (tests) via
`DbModule.onApplicationShutdown`, enabled by `app.enableShutdownHooks()`
in `bootstrap.ts`.

### Rules

- **`schema/auth.ts` is machine-generated by `bunx @better-auth/cli`.** Treat
  it as a black box: regenerate with `bun run db:auth-generate`, accept its
  conventions (text IDs, mixed `.defaultNow()` on `updatedAt`), and never
  hand-edit. Any local changes get clobbered on the next regen.
- **Every other table uses `uuid` primary keys**:
  `id: uuid('id').defaultRandom().primaryKey()`. RDS Postgres 16 supplies
  `gen_random_uuid()` natively — no extension required.
- **Cross-domain foreign keys to Better Auth tables stay `text`** because
  `user.id` is `text`. Example: `createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' })`.
- **Every table includes `createdAt: timestamp('created_at').defaultNow().notNull()`**
  and `updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull()`
  for your own domains. (Better Auth's tables are slightly different — see
  rule 1.)
- **Drop-in pattern for a new domain (e.g. `jobs`):**
  1. Create `apps/api/src/db/schema/jobs.ts` with `pgTable(...)` + indexes
     + relations.
  2. Add `export * from './jobs';` to `schema/index.ts`.
  3. `cd apps/api && bun run db:generate` — drizzle-kit produces a new
     `drizzle/<n>_<name>.sql` migration. Commit both the schema and the
     SQL file.
  4. Migrations apply automatically at container start via `runMigrations()`
     in `main.ts`. State is tracked in the `__drizzle_migrations` table.

## Conventions

- **Code comments.** Do not narrate what code does ("// increment the
  counter"). Comments should explain non-obvious intent, trade-offs, or
  constraints that the code cannot convey.
- **Commits.** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, `test:`, `ci:`).
- **Public DTOs.** Every controller response shape that ships in production
  should have a typed DTO class with `@ApiProperty` decorators so it appears
  in `docs-json`. Agents and generated clients depend on it.
- **Secrets.** Never commit `apps/api/.env`, `packages/terraform-aws/terraform.tfvars`,
  or anything matching `*.tfstate*`. Secrets in production are SSM Parameter
  Store ARNs referenced from `apps/api/taskdef.template.json`.
- **Bun, not npm.** Lockfile is `bun.lock`. Adding deps: `bun add <pkg>`
  inside the workspace that needs it.

## Where things live

```
apps/api/src/
  main.ts                # entry — runs migrations, creates Nest app, listens
  bootstrap.ts           # shared wiring (prefix, shutdown hooks, Swagger, Inngest mount)
  app.module.ts          # root NestJS module (Config, Auth, Db, Http, Email, Health, Mcp)
  db/
    index.ts             # postgres-js pool + Drizzle client + Database type
    db.module.ts         # exposes DATABASE provider + drains pool on shutdown
    migrator.ts          # runtime migrator — runs before app.listen()
    schema/              # one file per domain + barrel index.ts
      auth.ts            # Better Auth tables (CLI-owned, do not hand-edit)
  email/
    email.module.ts      # Nest provider for EMAIL_PROVIDER
    email.factory.ts     # plain factory used by both EmailModule AND lib/auth.ts
    providers/           # console | resend | ses implementations
  health/                # /api/health: controller + service + DTO
  http/
    http.module.ts       # Nest provider for HTTP_CLIENT
    http.factory.ts      # plain factory used by both HttpModule AND lib/auth.ts
    clients/             # fetch | axios implementations
  inngest/
    client.ts            # singleton Inngest client (typed via events.ts)
    events.ts            # typed event catalog — every send + cancelOn references it
    functions/
      index.ts           # registry array — every function lands here
      hello-world.ts     # smoke / demo function
      onboarding/        # post-signup email sequence (welcome + nudges)
        index.ts         # barrel — re-exports functions + consts
        consts.ts        # ids, names, step ids, MATCH_USER_ID_EXPR, delay default
        utils.ts         # shared helpers (emailFrom, nudgeDelay)
        welcome.ts       # sends welcome email on user/created
        inbox-nudge.ts   # 5d nudge, cancelOn integrations/inbox.connected
        resume-nudge.ts  # 5d nudge, cancelOn resumes/uploaded
        onboarding.spec.ts
  lib/
    auth.ts              # Better Auth instance — source of truth for /api/auth/*
    auth-emails.ts       # templates for verify + reset (Better Auth's direct callbacks)
    onboarding-emails.ts # templates for welcome + nudges (rendered by Inngest functions)
    email-render.ts      # shared wrap()/button() chrome for every template
  mcp/                   # /api/mcp: controller + service registering MCP tools
                         #   getHealth, listInngestFunctions,
                         #   markInboxConnected, markResumeUploaded
apps/api/drizzle/        # generated SQL migrations + drizzle-kit meta
apps/api/test/           # e2e tests (jest-e2e config) — auth.e2e-spec.ts needs TEST_DATABASE_URL
apps/api/Dockerfile      # multi-stage Bun build (copies drizzle/ into runner)
apps/api/taskdef.template.json   # canonical ECS task definition (envsubst'd in CI)
apps/api/docker-compose.yml      # local Postgres for `bun run dev`

buildspec.yml            # CodeBuild "Build": builds + pushes Docker image (SHA tag)
deployspec.yml           # CodeBuild "Deploy": renders taskdef, register, update service
packages/terraform-aws/  # all AWS infra (VPC, ECS, ALB, RDS, ECR, CodePipeline)
```

## CI/CD (read before touching infra)

The deploy is **CodeBuild-owned**, not Terraform-owned:

1. Push to `main` → CodePipeline V2 trigger fires.
2. **Source** stage clones the repo via CodeStar Connections.
3. **Build** stage runs `buildspec.yml`: builds the Docker image, tags it with
   the full commit SHA (never `:latest`), pushes to ECR, and emits
   `image_uri.txt` as an artifact.
4. **Deploy** stage runs `deployspec.yml`: `envsubst` renders
   `apps/api/taskdef.template.json` using env vars injected by the
   `aws_codebuild_project.api_deploy` definition, registers a new ECS task
   definition revision, calls `aws ecs update-service`, and waits for
   stabilization.

Therefore:

- The task definition is **not** managed by Terraform. `api_service.tf`
  reads it via `data "aws_ecs_task_definition" "api"` only.
- `aws_ecs_service.api` has `lifecycle { ignore_changes = [task_definition] }`
  so Terraform doesn't fight CodeBuild over revisions.
- To change runtime env or secrets, edit `apps/api/taskdef.template.json` and
  the matching `environment_variable` blocks in
  `packages/terraform-aws/cicd.tf` (the deploy CodeBuild project).

## What not to do

- **Don't** create or modify `aws_ecs_task_definition` resources in Terraform.
- **Don't** push an image tagged `:latest` and expect the service to pick it
  up; we deploy by SHA on purpose.
- **Don't** add controllers without `@ApiTags` + `@ApiOperation` +
  `@ApiOkResponse` — they'll be invisible to clients and agents.
- **Don't** add side effects in module load order (Drizzle's client is the
  one exception and is already isolated in `src/db/index.ts`).
- **Don't** add comments that just describe the change you're making in a
  PR. Use the commit message for that.

## Documentation for downstream agents

Anything you build that should be callable by an external agent must:

1. Be reachable via the HTTP API and show up in `/api/docs-json`.
2. Have a typed DTO for both input and response.
3. Have a corresponding MCP tool registered in `apps/api/src/mcp/mcp.service.ts`
   so the agent surface stays in sync with the HTTP surface.
4. Have at least one unit test on the service, and (if it touches the request
   lifecycle) one e2e test on the controller AND one on the MCP tool.

When in doubt, copy the pattern in `apps/api/src/health/`:

```
health/
  health.module.ts             # exports HealthService
  health.service.ts            # business logic (no HTTP knowledge)
  health.service.spec.ts       # unit test
  health.controller.ts         # @ApiTags / @ApiOperation / @ApiOkResponse
  dto/health-response.dto.ts   # @ApiProperty-decorated response shape
```

The controller and the MCP tool both delegate to the same service, so the
two surfaces can't drift.
