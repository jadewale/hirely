import { sql } from 'drizzle-orm';
import type { Database } from './client';

export interface DatabaseHealth {
  ok: true;
  latencyMs: number;
}

/**
 * Liveness/readiness probe for the database: runs a trivial `SELECT 1` and
 * reports round-trip latency. Throws if the connection can't be established or
 * the query fails — callers translate that into their own error surface (e.g.
 * career-api returns 503 from GET /api/health/db).
 */
export async function checkDatabase(database: Database): Promise<DatabaseHealth> {
  const start = Date.now();
  await database.execute(sql`select 1`);
  return { ok: true, latencyMs: Date.now() - start };
}
