/**
 * Runs before any test module is imported (registered via `setupFiles`). Sets
 * env vars read at module-load time by feature code — notably `@career/db`'s
 * client, which constructs its postgres-js pool when first imported.
 *
 * Uses a SEPARATE test database (career_test) from the dev DB, keeping
 * production/dev and test connections independently configured. postgres-js
 * connects lazily, so this URL is only contacted by tests that actually query
 * (unit tests mock `@career/db`; the liveness e2e never touches the DB).
 */
process.env.DATABASE_URL ??=
  'postgres://career:career@127.0.0.1:5444/career_test';
process.env.FRONTEND_URL ??= 'http://localhost:3100';
// auth.ts calls requireEnv('BETTER_AUTH_SECRET') at module load, so it must be
// set before any test imports AppModule.
process.env.BETTER_AUTH_SECRET ??= 'test-better-auth-secret-not-real-32chars!!';
process.env.BETTER_AUTH_URL ??= 'http://localhost:4100';
