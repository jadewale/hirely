# Hirely API

Minimal NestJS service. Starting point that we'll grow feature-by-feature.

## What's in here

- NestJS HTTP server
- Postgres connection via Drizzle ORM
- `GET /api/health` endpoint that also verifies the DB connection

## Layout

```
src/
  app.module.ts        # Root module (Config + Db + Health)
  main.ts              # Bootstrap, sets /api global prefix
  db/
    db.module.ts       # @Global module exposing the "DATABASE" provider
    index.ts           # Creates the postgres + drizzle client
    schema.ts          # Drizzle schema (empty for now)
  health/
    health.module.ts
    health.controller.ts
```

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL
```

## Run

```bash
npm run dev            # watch mode
npm run start          # one-shot
npm run build          # compile to dist/
npm run start:prod     # node dist/main
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

## Database

We use Drizzle Kit for migrations. Add tables to `src/db/schema.ts` then:

```bash
npm run db:generate    # produce SQL migration files
npm run db:migrate     # apply them
npm run db:push        # push schema directly (dev only)
npm run db:studio      # open Drizzle Studio
```

## Environment

| Variable       | Description                  |
| -------------- | ---------------------------- |
| `DATABASE_URL` | Postgres connection string   |
| `PORT`         | HTTP port (default `4000`)   |
