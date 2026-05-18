/**
 * Barrel for all Drizzle table definitions.
 *
 * Add one re-export per domain. Each domain owns its own file under this
 * folder — keep table definitions, indexes, and relations together so the
 * file you grep is the file you change.
 *
 * The order here doesn't matter for runtime, but cross-domain foreign keys
 * should reference imported symbols (not re-imports through this barrel)
 * to avoid circular-import surprises.
 */
export * from './auth';
export * from './gmail';
