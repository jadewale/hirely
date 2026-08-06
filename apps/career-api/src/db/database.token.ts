/**
 * DI token for the Drizzle `Database` client provided by DbModule.
 *
 * Kept in its own module (no `@career/db` import) so consumers and their unit
 * tests can depend on the token without pulling in the real database client.
 */
export const DATABASE = 'DATABASE';
