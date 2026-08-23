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

// A small starter job catalog so the browse UI has content in local dev.
const SEED_JOBS = [
  {
    title: 'Senior Backend Engineer',
    company: 'Northwind Labs',
    location: 'London, UK',
    remoteType: 'HYBRID',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    description:
      'Build and operate high-throughput services in TypeScript/Node. Own reliability, on-call, and API design.',
    salaryMinMinor: 9_000_000,
    salaryMaxMinor: 12_000_000,
    salaryCurrency: 'GBP',
    source: 'seed',
    url: 'https://example.com/jobs/senior-backend',
  },
  {
    title: 'Frontend Engineer (React)',
    company: 'Bright Widgets',
    location: 'Remote (EU)',
    remoteType: 'REMOTE',
    employmentType: 'FULL_TIME',
    seniority: 'Mid',
    description:
      'Ship polished React/Next.js interfaces. Care about accessibility, performance, and design systems.',
    salaryMinMinor: 6_000_000,
    salaryMaxMinor: 8_500_000,
    salaryCurrency: 'EUR',
    source: 'seed',
    url: 'https://example.com/jobs/frontend-react',
  },
  {
    title: 'Platform / DevOps Engineer',
    company: 'Acme Cloud',
    location: 'New York, NY',
    remoteType: 'ONSITE',
    employmentType: 'FULL_TIME',
    seniority: 'Senior',
    description:
      'Terraform, AWS, ECS/Fargate, CI/CD. Make deploys boring and infrastructure self-service.',
    salaryMinMinor: 15_000_000,
    salaryMaxMinor: 19_000_000,
    salaryCurrency: 'USD',
    source: 'seed',
    url: 'https://example.com/jobs/platform-devops',
  },
  {
    title: 'Product Designer',
    company: 'Northwind Labs',
    location: 'Remote (US)',
    remoteType: 'REMOTE',
    employmentType: 'CONTRACT',
    seniority: 'Mid',
    description:
      'Own end-to-end product design for a new candidate experience. Figma, prototyping, user research.',
    salaryMinMinor: 8_000_000,
    salaryMaxMinor: 11_000_000,
    salaryCurrency: 'USD',
    source: 'seed',
    url: 'https://example.com/jobs/product-designer',
  },
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

  // Jobs: seed once (keyed on the admin as creator) if the catalog is empty.
  const [admin] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, 'admin@career.test'))
    .limit(1);
  const existing = await db
    .select({ id: schema.job.id })
    .from(schema.job)
    .limit(1);
  if (admin && existing.length === 0) {
    await db
      .insert(schema.job)
      .values(SEED_JOBS.map((j) => ({ ...j, createdByUserId: admin.id })));
    console.log(`seeded ${SEED_JOBS.length} jobs`);
  } else {
    console.log('jobs already present — skipping job seed');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
