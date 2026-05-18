/**
 * Tables that back Hirely's Gmail integration.
 *
 * Two tables. They split along a natural seam:
 *
 *   - `gmail_message`   - one row per classified Gmail thread/message,
 *     produced by the LLM classifier. Source-of-truth for the user's
 *     pipeline view.
 *
 *   - `inbox_scan_progress` - one row per `inbox-scan-run` Inngest run,
 *     tracks how far through the initial 300-message backfill we are so
 *     the frontend can poll a progress bar.
 *
 * Why message-level rather than thread-level? Gmail's classification model
 * is happiest when classifying individual messages: a single recruiter
 * thread can drift across stages (reach-out -> screen scheduled -> offer)
 * over weeks, and we want each turn to carry its own label. The pipeline
 * view rolls these up to threads at read time.
 *
 * Storage philosophy for Limited Use compliance:
 *   - We do NOT store message bodies. Only what we need to render the
 *     pipeline row: sender, subject, snippet (first ~280 chars from the
 *     Gmail-provided preview), and classification.
 *   - Tokens for accessing Gmail live in Better Auth's `account` table,
 *     never copied here.
 *   - On disconnect we DELETE all rows for the user. See Phase 2D for the
 *     cleanup Inngest function.
 */
import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

/**
 * Pipeline stages produced by the classifier.
 *
 * Kept as text + a CHECK constraint instead of a pg enum so we can iterate
 * (add "Negotiating", "Withdrawn", etc.) without an ALTER TYPE migration
 * that locks the table. The set is small enough that the CHECK pays for
 * itself by keeping bad classifications out of the row.
 */
export const GMAIL_MESSAGE_STAGES = [
  'unrelated',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'rejected',
  'ghosted',
] as const;

export type GmailMessageStage = (typeof GMAIL_MESSAGE_STAGES)[number];

export const gmailMessage = pgTable(
  'gmail_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Gmail's stable IDs. Both come from the API verbatim; never invent.
    gmailMessageId: text('gmail_message_id').notNull(),
    gmailThreadId: text('gmail_thread_id').notNull(),

    // What the user sees in the pipeline row. None of this is body text;
    // `snippet` is the same preview string Gmail shows in its own list
    // view and is bounded to ~280 chars by Gmail's API.
    sender: text('sender').notNull(),
    senderEmail: text('sender_email').notNull(),
    subject: text('subject').notNull(),
    snippet: text('snippet'),

    // RFC2822 Date header off the message. We store this even though we
    // also have createdAt because pipeline ordering is by message time,
    // not insert time (a late-arriving classification of an old message
    // should still sort by the message's original timestamp).
    receivedAt: timestamp('received_at').notNull(),

    // Classifier output. confidence is 0-1 so the UI can render a "low
    // confidence -- please review" affordance on close calls.
    stage: text('stage').notNull(),
    confidence: integer('confidence').notNull(), // 0-100 (stored as int to avoid pg float drift)
    reasoning: text('reasoning'),

    // Gmail labelIds applied by us (e.g. "Label_123"). NULL if we have
    // not yet pushed labels back to Gmail for this thread (Phase 2B).
    appliedLabelIds: jsonb('applied_label_ids').$type<string[] | null>(),

    classifiedAt: timestamp('classified_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // One row per (user, message). If the classifier re-runs on the same
    // message (intentional or via Inngest retry) we upsert into this row.
    uniqueIndex('gmail_message_user_message_uniq').on(
      table.userId,
      table.gmailMessageId,
    ),
    // The pipeline view queries by (user, stage, receivedAt desc). This
    // composite index covers it.
    index('gmail_message_user_stage_received_idx').on(
      table.userId,
      table.stage,
      table.receivedAt,
    ),
    // Backstop CHECK so a bug in the classifier prompt can't poison the
    // pipeline with stages we don't render. List has to be inline literal
    // -- the CHECK is generated at migration time and can't reference a
    // TS array.
    check(
      'gmail_message_stage_chk',
      sql`${table.stage} IN ('unrelated','applied','phone_screen','interview','offer','rejected','ghosted')`,
    ),
  ],
);

export const gmailMessageRelations = relations(gmailMessage, ({ one }) => ({
  user: one(user, {
    fields: [gmailMessage.userId],
    references: [user.id],
  }),
}));

/**
 * Tracks the lifecycle of the initial inbox scan kicked off when a user
 * grants Gmail scopes.
 *
 * One row per (userId, runId). runId is the Inngest run-id of the
 * `sync-inbox-initial` function -- using the framework's run id as our
 * primary key means we don't have to coin our own correlation id and
 * the dashboard polling endpoint can reference the same id Inngest
 * exposes.
 */
export const inboxScanProgress = pgTable(
  'inbox_scan_progress',
  {
    runId: text('run_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // States are explicit because the UI shows different copy for each:
    //   - listing:     "Reading your inbox..."
    //   - classifying: "Analyzing 240 messages..."
    //   - completed:   transition to the pipeline view
    //   - failed:      show retry CTA
    status: text('status').notNull(), // 'listing' | 'classifying' | 'completed' | 'failed'

    // Totals are filled in as we discover them. `targetTotal` is what we
    // asked for (e.g. 300), `discoveredTotal` is what Gmail actually had,
    // `classifiedCount` ticks up per completed batch.
    targetTotal: integer('target_total').notNull(),
    discoveredTotal: integer('discovered_total').default(0).notNull(),
    classifiedCount: integer('classified_count').default(0).notNull(),
    batchesTotal: integer('batches_total').default(0).notNull(),
    batchesCompleted: integer('batches_completed').default(0).notNull(),

    errorMessage: text('error_message'),

    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Common access pattern: "most recent scan for this user" (the status
    // endpoint hits this index).
    index('inbox_scan_progress_user_started_idx').on(
      table.userId,
      table.startedAt,
    ),
    check(
      'inbox_scan_progress_status_chk',
      sql`${table.status} IN ('listing','classifying','completed','failed')`,
    ),
  ],
);

export const inboxScanProgressRelations = relations(
  inboxScanProgress,
  ({ one }) => ({
    user: one(user, {
      fields: [inboxScanProgress.userId],
      references: [user.id],
    }),
  }),
);
