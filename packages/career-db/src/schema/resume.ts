import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Candidate résumé metadata (RR-018). One row per uploaded résumé file.
 *
 * IMPORTANT: the file BYTES live in S3, never in Postgres. This table holds
 * only metadata plus the opaque S3 object key (`storage_key`). The key is never
 * returned to the browser — downloads go through a freshly signed URL.
 *
 * Lifecycle: a row is created `PENDING` when a pre-signed upload URL is minted;
 * it becomes `READY` once the client confirms the S3 PUT succeeded. Unconfirmed
 * `PENDING` rows are harmless (the object may never exist) and can be swept
 * later. Conventions mirror the rest of career-db: UUID PK, tz-aware
 * timestamps, FK to the Better Auth `user` table kept as `text`.
 */
export const resume = pgTable(
  'resume',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    fileName: text('file_name').notNull(), // original client filename
    contentType: text('content_type').notNull(), // e.g. application/pdf
    sizeBytes: integer('size_bytes').notNull(),

    storageKey: text('storage_key').notNull().unique(), // opaque S3 object key
    status: text('status').notNull().default('PENDING'), // PENDING | READY

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('resume_user_id_idx').on(t.userId)],
);
