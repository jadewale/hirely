# @career/db

The career-platform database package: Drizzle ORM client, schema, migrations,
and health check. **Sole approved entry point to Postgres** — `apps/career-api`
and approved background workflows import it; `apps/career-web` must never
depend on it.

## Local development

Start a local Postgres (from the repo root):

```bash
docker compose up -d career-postgres     # postgres:16 on 127.0.0.1:5444
```

Point the API at it (in `apps/career-api/.env`):

```
DATABASE_URL=postgres://career:career@127.0.0.1:5444/career
```

> Use `127.0.0.1`, not `localhost` — on macOS (Docker Desktop/OrbStack)
> `localhost` can resolve to IPv6 `::1` while the container binds IPv4, causing
> a confusing connection failure.

## Migrations

Run from the **repository root** (drizzle-kit resolves this package's config):

```bash
bun run career:db:generate    # generate SQL from src/schema/*.ts  -> drizzle/
bun run career:db:migrate     # apply pending migrations
bun run career:db:studio      # browse the DB
```

Migration state is tracked in `__drizzle_migrations`, so re-running is safe.
There are no domain tables yet (RR-003), so `db:generate` is a no-op until the
first schema lands (RR-008).

## Production vs test connections

- **Production:** `DATABASE_URL` is injected from SSM into the ECS task
  (points at the `career` database on the shared RDS instance). Migrations are
  applied out-of-band, not at task boot.
- **Test:** `apps/career-api/test/jest.setup.ts` sets a separate
  `DATABASE_URL` (a `career_test` database). Unit tests mock the client;
  integration against a real DB uses the docker-compose Postgres above.
