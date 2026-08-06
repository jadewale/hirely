/**
 * Barrel for career-platform Drizzle table schemas.
 *
 * Domain tables are added by their tickets (RR-008 candidate profiles, RR-010
 * assistant profiles, RR-011 assignments, …). Each domain drops in as
 * `src/schema/<domain>.ts` and is re-exported here; `drizzle.config.ts` globs
 * this directory, so no config change is needed when a domain is added.
 *
 * Empty for now — RR-003 ships the client, migrator, and health check with no
 * domain tables, so `db:generate` produces no migration (deterministic no-op).
 */
export {};
