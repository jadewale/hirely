/**
 * Runtime migrator. Runs every pending Drizzle migration in `apps/api/drizzle`
 * before the Nest app starts accepting traffic.
 *
 * State is tracked in the `__drizzle_migrations` table that the postgres-js
 * migrator creates on first run, so re-running is safe across restarts. With
 * a single ECS replica we don't need an advisory lock; revisit if we ever
 * scale beyond one task during a rolling deploy.
 */
import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as path from 'node:path';
import postgres from 'postgres';

export async function runMigrations(): Promise<void> {
  const logger = new Logger('Migrator');
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to run migrations');
  }

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  logger.log(`applying migrations from ${migrationsFolder}`);

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    logger.log('migrations applied');
  } finally {
    await sql.end({ timeout: 5 });
  }
}
