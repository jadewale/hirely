import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Candidate profile (RR-008). One row per candidate user.
 *
 * Conventions: UUID primary key, timezone-aware timestamps, FK to the Better
 * Auth `user` table kept as `text`, salary stored as an integer in minor units
 * (e.g. cents) with a separate ISO-4217 currency. List fields are Postgres
 * arrays. An index backs the `user_id` lookup.
 */
export const candidateProfile = pgTable(
  'candidate_profile',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),

    firstName: text('first_name'),
    lastName: text('last_name'),
    phone: text('phone'),
    location: text('location'),
    headline: text('headline'),

    preferredJobTitles: text('preferred_job_titles')
      .array()
      .notNull()
      .default([]),
    preferredLocations: text('preferred_locations')
      .array()
      .notNull()
      .default([]),
    remotePreference: text('remote_preference'), // REMOTE | HYBRID | ONSITE | ANY

    minSalaryMinor: integer('min_salary_minor'), // integer minor units
    salaryCurrency: text('salary_currency'), // ISO 4217, e.g. USD

    workAuthorizationCountries: text('work_authorization_countries')
      .array()
      .notNull()
      .default([]),
    sponsorshipRequired: boolean('sponsorship_required'),

    profileCompletionPercentage: integer('profile_completion_percentage')
      .notNull()
      .default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('candidate_profile_user_id_idx').on(t.userId)],
);
