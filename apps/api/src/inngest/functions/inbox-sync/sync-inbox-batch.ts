/**
 * Worker function for a single 40-message classification batch.
 *
 * Driven by `integrations/inbox.scan.batch.requested` events fired from
 * `sync-inbox-initial.ts`. Concurrency capped so we don't slam Gmail or
 * the LLM (see INBOX_SCAN_BATCH_CONCURRENCY).
 *
 * The dedupe key on the trigger event (`${runId}-batch-${batchIndex}`)
 * prevents a re-emit of the same fanout from causing duplicate work.
 * Combined with the upsert on persist, the worker is safe to retry.
 */
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '../../../db';
import { gmailMessage } from '../../../db/schema';
import { batchGetMessages } from '../../../integrations/google/gmail.client';
import { getValidGoogleAccessToken } from '../../../integrations/google/oauth-tokens';
import { classifyBatch } from '../../../integrations/openai/classifier';
import { inngest } from '../../client';
import {
  inboxScanBatchClassified,
  inboxScanBatchRequested,
} from '../../events';
import {
  INBOX_SCAN_BATCH_CONCURRENCY,
  SYNC_INBOX_BATCH,
} from './consts';

export const syncInboxBatch = inngest.createFunction(
  {
    id: SYNC_INBOX_BATCH.id,
    name: SYNC_INBOX_BATCH.name,
    triggers: [{ event: inboxScanBatchRequested }],
    // Global cap on in-flight batches. NOT per-user: we want different
    // users' batches to share the bottleneck, because the bottleneck is
    // our OpenAI org-level rate limit, not Gmail's per-user one. If we
    // ever hit the LLM ceiling we lower this; if we want to prioritize
    // foreground users we add `key: 'event.data.userId'` to limit-per
    // user.
    concurrency: { limit: INBOX_SCAN_BATCH_CONCURRENCY },
    // Each run is bounded by HTTP latency (~10-20s typically), bump
    // retries so a transient blip doesn't drop user data on the floor.
    retries: 4,
  },
  async ({ event, step, logger }) => {
    const { userId, runId, batchIndex, batchesTotal, gmailMessageIds } =
      event.data;

    if (gmailMessageIds.length === 0) {
      logger.warn(
        `sync-inbox-batch: empty batch ${batchIndex} for run ${runId}`,
      );
      return { classified: 0 };
    }

    const accessToken = await step.run(
      SYNC_INBOX_BATCH.steps.loadAccount,
      async () => {
        const token = await getValidGoogleAccessToken(userId);
        return token.accessToken;
      },
    );

    const messages = await step.run(
      SYNC_INBOX_BATCH.steps.fetchMessages,
      async () => batchGetMessages(accessToken, gmailMessageIds),
    );

    const classifications = await step.run(
      SYNC_INBOX_BATCH.steps.classify,
      async () => classifyBatch(messages),
    );

    // Join classifications back to messages by gmailMessageId. The
    // classifier echoes the ID, so we don't rely on positional order.
    const messagesById = new Map(messages.map((m) => [m.id, m]));
    const rows = classifications
      .map((c) => {
        const m = messagesById.get(c.gmailMessageId);
        if (!m) return null;
        return {
          id: randomUUID(),
          userId,
          gmailMessageId: m.id,
          gmailThreadId: m.threadId,
          sender: m.from,
          senderEmail: m.fromEmail,
          subject: m.subject,
          snippet: m.snippet,
          receivedAt: new Date(m.receivedAt),
          stage: c.stage,
          confidence: c.confidence,
          reasoning: c.reasoning,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const persistedCount = await step.run(
      SYNC_INBOX_BATCH.steps.persist,
      async () => {
        if (rows.length === 0) return 0;
        await db
          .insert(gmailMessage)
          .values(rows)
          .onConflictDoUpdate({
            target: [gmailMessage.userId, gmailMessage.gmailMessageId],
            // Excluded refers to the row we tried to insert. We update
            // classification fields + the subject/sender/snippet too,
            // in case a re-classification ran against a thread Gmail
            // has since updated.
            set: {
              stage: sql`excluded.stage`,
              confidence: sql`excluded.confidence`,
              reasoning: sql`excluded.reasoning`,
              sender: sql`excluded.sender`,
              senderEmail: sql`excluded.sender_email`,
              subject: sql`excluded.subject`,
              snippet: sql`excluded.snippet`,
              receivedAt: sql`excluded.received_at`,
              classifiedAt: sql`now()`,
            },
          });
        return rows.length;
      },
    );

    await step.run(SYNC_INBOX_BATCH.steps.notify, async () => {
      await inngest.send(
        inboxScanBatchClassified.create(
          {
            userId,
            runId,
            batchIndex,
            batchesTotal,
            classifiedCount: persistedCount,
            // Pass the IDs along so consumers (apply-labels-batch) can
            // act on this specific batch's rows without re-querying.
            gmailMessageIds: rows.map((r) => r.gmailMessageId),
          },
          { id: `${runId}-batch-${batchIndex}-classified` },
        ),
      );
    });

    return { classified: persistedCount };
  },
);
