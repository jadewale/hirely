import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Append-only audit log (RR-015). Every state-changing action in the platform
 * writes one row here; nothing reads outside of the admin viewer (RR-016).
 *
 * Immutability is enforced at TWO layers:
 *   1. Application: `AuditService` exposes only `record` + `list` — there is no
 *      code path to UPDATE or DELETE a row.
 *   2. Database: the accompanying migration installs BEFORE UPDATE / DELETE /
 *      TRUNCATE triggers that raise EXCEPTION for every role, including the DB
 *      owner. See `drizzle/0002_*_audit_log.sql`.
 *
 * Sensitive values (passwords, tokens, résumé contents) must never be stored
 * here. The service redacts known-sensitive keys from `metadata` defensively;
 * callers are still expected to pass structured metadata rather than raw
 * request bodies.
 *
 * FK to `user.id` is `set null` so purging a user leaves the audit trail
 * intact (rows describe historical actions that outlive the user account).
 * Candidate / assignment ids are held as `uuid` (no FK yet) so this table can
 * land ahead of the RR-008 / RR-011 domain tables without a merge dependency.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    actorRole: text('actor_role'),
    candidateId: uuid('candidate_id'),
    assignmentId: uuid('assignment_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    requestId: text('request_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_log_actor_user_id_idx').on(table.actorUserId),
    index('audit_log_candidate_id_idx').on(table.candidateId),
    index('audit_log_assignment_id_idx').on(table.assignmentId),
    index('audit_log_action_idx').on(table.action),
    index('audit_log_resource_type_idx').on(table.resourceType),
    index('audit_log_request_id_idx').on(table.requestId),
    // Descending index supports the default admin viewer sort (newest first).
    index('audit_log_created_at_idx').on(table.createdAt),
  ],
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
}));
