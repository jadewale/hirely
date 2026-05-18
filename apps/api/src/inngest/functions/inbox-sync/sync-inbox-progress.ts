/**
 * Single-flight aggregator for inbox scan progress.
 *
 * Every batch worker fires `integrations/inbox.scan.batch.classified`
 * when it persists. This function listens for those events, bumps the
 * `inbox_scan_progress` counters, and -- once the last batch lands --
 * flips the row to `completed` and emits `inbox.scan.completed`.
 *
 * Why a separate function instead of doing this inside the batch
 * worker?
 *
 *   1. Single-writer pattern. With concurrency=1 keyed on runId, only
 *      one Inngest run at a time touches the progress row, so we never
 *      need a SELECT ... FOR UPDATE or app-level lock. With the batch
 *      worker writing directly, three concurrent batches could each
 *      read batchesCompleted=N and all increment to N+1, losing two.
 *
 *   2. Cleaner failure surface. A classify failure retries the batch
 *      worker; an aggregator failure retries this. They don't collide.
 *
 *   3. The `inbox.scan.completed` event is the right place to chain
 *      "post-scan" workflows (label application in Phase 2B, calendar
 *      pre-warm in Phase 2C). Keeping completion logic in one fn means
 *      adding those is a `cancelOn` away.
 */
import { and, eq, sql } from 'drizzle-orm';

import { db } from '../../../db';
import { inboxScanProgress } from '../../../db/schema';
import { inngest } from '../../client';
import {
  inboxScanBatchClassified,
  inboxScanCompleted,
} from '../../events';
import { SYNC_INBOX_PROGRESS } from './consts';

export const syncInboxProgress = inngest.createFunction(
  {
    id: SYNC_INBOX_PROGRESS.id,
    name: SYNC_INBOX_PROGRESS.name,
    triggers: [{ event: inboxScanBatchClassified }],
    concurrency: {
      limit: 1,
      key: 'event.data.runId',
    },
  },
  async ({ event, step, logger }) => {
    const { userId, runId, classifiedCount, batchesTotal } = event.data;

    // Step 1: Atomically bump counters. UPDATE ... RETURNING gives us
    // the post-bump values without a separate SELECT, so we know in one
    // round-trip whether we're the batch that crossed the finish line.
    const updated = await step.run(
      SYNC_INBOX_PROGRESS.steps.bumpCounters,
      async () => {
        const rows = await db
          .update(inboxScanProgress)
          .set({
            classifiedCount: sql`${inboxScanProgress.classifiedCount} + ${classifiedCount}`,
            batchesCompleted: sql`${inboxScanProgress.batchesCompleted} + 1`,
          })
          .where(
            and(
              eq(inboxScanProgress.runId, runId),
              eq(inboxScanProgress.userId, userId),
            ),
          )
          .returning({
            batchesCompleted: inboxScanProgress.batchesCompleted,
            classifiedCount: inboxScanProgress.classifiedCount,
          });
        return rows[0] ?? null;
      },
    );

    if (!updated) {
      // Could happen if the progress row was deleted (e.g. user
      // disconnected mid-scan). Log and move on -- nothing else to do.
      logger.warn(
        `sync-inbox-progress: no progress row for run ${runId}; classify event dropped`,
      );
      return { dropped: true };
    }

    if (updated.batchesCompleted >= batchesTotal) {
      await step.run(SYNC_INBOX_PROGRESS.steps.maybeComplete, async () => {
        await db
          .update(inboxScanProgress)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(inboxScanProgress.runId, runId));

        await inngest.send(
          inboxScanCompleted.create(
            {
              userId,
              runId,
              classifiedTotal: updated.classifiedCount,
            },
            { id: `${runId}-completed` },
          ),
        );
      });
    }

    return {
      batchesCompleted: updated.batchesCompleted,
      classifiedTotal: updated.classifiedCount,
    };
  },
);
