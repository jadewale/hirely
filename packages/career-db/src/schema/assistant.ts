import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Professional profile for an ASSISTANT-role user (RR-010). One row per user
 * (the FK is unique), created/edited by the assistant themselves.
 *
 * `status` is the account posture the delegated-authorization service (RR-012)
 * checks: a SUSPENDED assistant is rejected from acting on any assignment. It is
 * ADMIN-owned — the assistant's own profile edits never change it (see the
 * upsert path in AssistantProfileService), only the admin status endpoint does.
 *
 * Money follows the repo convention: minor units (cents) in an integer column.
 */
export const assistantProfile = pgTable(
  'assistant_profile',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // text (not uuid) because it references Better Auth's text `user.id`.
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    headline: text('headline'),
    bio: text('bio'),
    // IANA timezone name (e.g. "America/New_York").
    timezone: text('timezone'),
    hourlyRateCents: integer('hourly_rate_cents'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  // The unique constraint on user_id already indexes the FK; status is indexed
  // for "list active assistants"-style queries.
  (table) => [index('assistant_profile_status_idx').on(table.status)],
);

export const assistantProfileRelations = relations(
  assistantProfile,
  ({ one }) => ({
    user: one(user, {
      fields: [assistantProfile.userId],
      references: [user.id],
    }),
  }),
);
