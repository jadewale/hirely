/**
 * Seed one user per role (RR-006). Run from the repo root:
 *   bun run career:db:seed
 *
 * Sign-up can't set `role` (input: false in auth config), so we create each user
 * via Better Auth and then set the role directly in the DB — mirroring how the
 * admin flow (a later ticket) will assign roles. Idempotent: re-running just
 * re-applies the roles.
 */
import { db, schema, eq } from '@career/db';
import { auth } from './lib/auth';

const PASSWORD = 'Password123!';
const SEED_USERS = [
  {
    email: 'candidate@career.test',
    name: 'Casey Candidate',
    role: 'CANDIDATE',
  },
  {
    email: 'assistant@career.test',
    name: 'Avery Assistant',
    role: 'ASSISTANT',
  },
  { email: 'admin@career.test', name: 'Ada Admin', role: 'ADMIN' },
] as const;

async function main(): Promise<void> {
  for (const u of SEED_USERS) {
    try {
      await auth.api.signUpEmail({
        body: { email: u.email, password: PASSWORD, name: u.name },
      });
    } catch {
      // Already exists — fine, we still (re)apply the role below.
    }
    await db
      .update(schema.user)
      .set({ role: u.role })
      .where(eq(schema.user.email, u.email));
    console.log(
      `seeded ${u.role.padEnd(9)} ${u.email}  (password: ${PASSWORD})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
