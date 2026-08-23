/**
 * Seed one user per role (RR-006). Run from the repo root:
 *   bun run career:db:seed
 *
 * Sign-up can't set `role` (input: false in auth config), so we create each user
 * via Better Auth and then set the role directly in the DB — mirroring how the
 * admin flow (a later ticket) will assign roles. Idempotent: re-running just
 * re-applies the roles.
 */
import { db, schema, eq, and } from '@career/db';
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

  // Assignment: link the seed assistant to the seed candidate so the delegated
  // flow (and later impersonation) is testable out of the box.
  const idFor = async (email: string): Promise<string | null> => {
    const [u] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    return u?.id ?? null;
  };
  const candidateId = await idFor('candidate@career.test');
  const assistantId = await idFor('assistant@career.test');
  const adminId = await idFor('admin@career.test');
  if (candidateId && assistantId) {
    const existing = await db
      .select({ id: schema.assignment.id })
      .from(schema.assignment)
      .where(
        and(
          eq(schema.assignment.candidateUserId, candidateId),
          eq(schema.assignment.assistantUserId, assistantId),
          eq(schema.assignment.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.assignment).values({
        candidateUserId: candidateId,
        assistantUserId: assistantId,
        permissions: [
          'candidate.profile.read',
          'candidate.documents.read',
          'application.create',
        ],
        status: 'ACTIVE',
        createdByUserId: adminId,
      });
      console.log('seeded 1 assignment (assistant -> candidate)');
    } else {
      console.log('assignment already present — skipping');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
