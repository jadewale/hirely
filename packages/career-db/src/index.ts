/**
 * Database package for the career-platform (Drizzle ORM + PostgreSQL).
 *
 * This is the ONLY approved entry point to the database: `apps/career-api`
 * (and approved background workflows) may import it; `apps/career-web` must
 * never depend on it.
 *
 * The runtime migrator lives on the `@career/db/migrator` subpath so its
 * Node-only internals stay out of the app/test import graph.
 */
export { db, pgClient, type Database } from './client';
export { checkDatabase, type DatabaseHealth } from './health';
export * as schema from './schema';

// Re-export the common Drizzle query operators so consumers build queries
// through @career/db (the single DB entry point) instead of importing
// drizzle-orm directly.
export {
  eq,
  and,
  or,
  not,
  inArray,
  ilike,
  sql,
  desc,
  asc,
  count,
  gte,
  lte,
} from 'drizzle-orm';
