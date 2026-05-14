/**
 * Runs before any test module is imported. We use this to set env vars that
 * are read at module-load time by feature code (DbModule's postgres client,
 * Better Auth's `requireEnv`, Inngest's signing-key check, etc.).
 *
 * Inline `process.env.X ??= '...'` at the top of spec files does NOT work
 * with SWC's CommonJS output because SWC hoists `import` statements above
 * the file's top-level executable statements. setupFiles avoids that — it
 * runs as its own module before any spec or AppModule imports.
 */
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-not-real';
process.env.BETTER_AUTH_URL ??= 'http://localhost:4000';
process.env.INNGEST_DEV ??= '1';
