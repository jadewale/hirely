import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as path from 'node:path';
import postgres from 'postgres';

/**
 * Programmatic migrator. Applies every pending migration in the package's
 * `drizzle/` folder against a short-lived single connection. Migration state
 * lives in the `__drizzle_migrations` table the postgres-js migrator creates,
 * so re-running is safe.
 *
 * This is NOT wired into career-api's boot path in RR-003 (deployed tasks must
 * not fail to start on a missing/empty DB). Migrations are applied out-of-band
 * via `db:migrate` (drizzle-kit) from the repo root. This helper exists for a
 * future ticket that wants boot-time migration behind an explicit flag.
 *
 * Exposed on the `@career/db/migrator` subpath, not the package root, so its
 * Node-only `__dirname` never enters the app/test import graph.
 */
const defaultMigrationsFolder = path.resolve(__dirname, '..', 'drizzle');

export interface RunMigrationsOptions {
  url?: string;
  migrationsFolder?: string;
}

export async function runMigrations(
  options: RunMigrationsOptions = {},
): Promise<void> {
  const url = options.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const migrationsFolder = options.migrationsFolder ?? defaultMigrationsFolder;
  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
