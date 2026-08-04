/**
 * Database package for the career-platform (Drizzle ORM + PostgreSQL).
 *
 * The Drizzle client, schema, migrations, and health check are configured in
 * RR-003. This package is the ONLY approved entry point to the database:
 * `apps/career-api` (and approved background workflows) may import it;
 * `apps/career-web` must never depend on it.
 */
export const DB_PACKAGE_VERSION = '0.0.0' as const;
