import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Assignment (RR-011): links a CANDIDATE user to an ASSISTANT user and delegates
 * a set of permissions. The delegated-authorization guard (RR-012) checks for an
 * ACTIVE assignment carrying the required permission before letting an assistant
 * touch a candidate's data — and the same active assignment is what gates
 * impersonation. Admins create/revoke; revoking flips `status` and stamps
 * `revoked_at` (rows are kept for the audit trail, never hard-deleted here).
 *
 * All three user references are `text` (Better Auth `user.id`). Permissions are
 * a Postgres text array of `assignmentPermission` values. Indexed on both sides
 * for "assignments for candidate X" / "for assistant Y" lookups.
 */
export const assignment = pgTable(
  'assignment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateUserId: text('candidate_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assistantUserId: text('assistant_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permissions: text('permissions').array().notNull().default([]),
    status: text('status').notNull().default('ACTIVE'), // ACTIVE | REVOKED
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    index('assignment_candidate_user_id_idx').on(t.candidateUserId),
    index('assignment_assistant_user_id_idx').on(t.assistantUserId),
  ],
);
