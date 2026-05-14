import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const toInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Exported so DbModule can close the pool on application shutdown — both in
 * production (SIGTERM from ECS) and in tests (when AppModule is torn down).
 * Treat this like a singleton: any consumer that wants to talk to Postgres
 * goes through `db`, never `pgClient` directly.
 *
 * Pool tuning lives behind env vars so we can change limits per-environment
 * (and per-task in ECS) without a code deploy. Total RDS connections used =
 * `PG_POOL_MAX * number of ECS tasks`, so size this against your RDS instance
 * class limits (e.g. db.t3.micro ≈ 85, db.t3.small ≈ 170).
 *
 * If we ever put PgBouncer in front of RDS in transaction-pooling mode, set
 * `PG_PREPARE=0` to disable named prepared statements (postgres-js's default
 * `prepare: true` is incompatible with transaction pooling).
 */
export const pgClient = postgres(connectionString, {
  max: toInt(process.env.PG_POOL_MAX, 10),
  idle_timeout: toInt(process.env.PG_IDLE_TIMEOUT, 30),
  connect_timeout: toInt(process.env.PG_CONNECT_TIMEOUT, 10),
  prepare: process.env.PG_PREPARE !== '0',
});

export const db = drizzle(pgClient, { schema });
export type Database = typeof db;
