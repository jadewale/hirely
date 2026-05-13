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
| Tests        | Jest (unit + e2e) via `ts-jest`                             |
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
  main.ts                # process entry — just calls configureApp + listen
  bootstrap.ts           # shared wiring (prefix, body parser, Swagger, Inngest)
  app.module.ts          # root NestJS module (Config, Db, Health, Mcp)
  db/                    # Drizzle client + schema
  health/                # /api/health: controller + service + DTO
  inngest/
    client.ts            # singleton Inngest client
    functions/           # one file per function, aggregated by index.ts
  mcp/                   # /api/mcp: controller + service registering MCP tools
apps/api/test/           # e2e tests (jest-e2e config)
apps/api/Dockerfile      # multi-stage Bun build
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
