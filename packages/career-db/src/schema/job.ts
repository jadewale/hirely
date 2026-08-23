import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Job catalog. Opportunities that admins/assistants add and candidates browse;
 * later, applications target a job and the résumé matcher ranks these rows.
 *
 * Conventions: UUID PK, tz-aware timestamps, salary as integer minor units with
 * a separate ISO-4217 currency. `created_by_user_id` records who added the job
 * (FK to the Better Auth `user`, kept as `text`); ON DELETE SET NULL so a job
 * outlives the account that entered it. Indexed on status for browse filters.
 */
export const job = pgTable(
  'job',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location'),
    remoteType: text('remote_type'), // REMOTE | HYBRID | ONSITE
    employmentType: text('employment_type'), // FULL_TIME | PART_TIME | ...
    seniority: text('seniority'),
    description: text('description'),

    salaryMinMinor: integer('salary_min_minor'),
    salaryMaxMinor: integer('salary_max_minor'),
    salaryCurrency: text('salary_currency'), // ISO 4217

    source: text('source'),
    url: text('url'),
    status: text('status').notNull().default('OPEN'), // OPEN | CLOSED

    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('job_status_idx').on(t.status)],
);
