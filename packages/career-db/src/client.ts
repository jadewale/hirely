import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle client for the career-platform database. This module is the single
 * source of the connection pool: any consumer talks to Postgres through `db`,
 * never `pgClient` directly. `pgClient` is exported only so the owning process
 * (career-api's DbModule) can close the pool on shutdown.
 *
 * Pool tuning lives behind env vars so limits can change per-environment (and
 * per-ECS-task) without a code deploy. Total RDS connections used =
 * `PG_POOL_MAX * number of tasks` — size against the RDS instance's limit.
 *
 * postgres-js connects lazily, so importing this module never opens a socket;
 * a bad/absent DATABASE_URL only surfaces on the first query.
 */
const toInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const pgClient = postgres(process.env.DATABASE_URL!, {
  max: toInt(process.env.PG_POOL_MAX, 10),
  idle_timeout: toInt(process.env.PG_IDLE_TIMEOUT, 30),
  connect_timeout: toInt(process.env.PG_CONNECT_TIMEOUT, 10),
  prepare: process.env.PG_PREPARE !== '0',
});

export const db = drizzle(pgClient, { schema });

export type Database = typeof db;
