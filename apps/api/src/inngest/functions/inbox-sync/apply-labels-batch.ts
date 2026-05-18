/**
 * Applies the Hirely/<stage> label to every message a batch classified.
 *
 * Triggered by `integrations/inbox.scan.batch.classified` so labels flow
 * into Gmail in near-real-time during the initial scan -- the user
 * watching the demo will see them tick on in their Gmail tab as the
 * scan progresses, which is exactly what a verification reviewer wants
 * to see for the gmail.labels + gmail.modify scopes.
 *
 * Exercises BOTH scopes in one function:
 *   - gmail.labels  : labels are created in the user's Gmail via the
 *                     `users.labels.create` endpoint (first time only;
 *                     cached after).
 *   - gmail.modify  : labels are attached to messages via the
 *                     `users.messages.modify` endpoint.
 *
 * Concurrency-capped per user (1) so two batches for the same user
 * serialize their `ensureLabel` calls -- prevents two parallel batches
 * from each trying to create "Hirely / Interview" before either
 * cached the result.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '../../../db';
import { gmailMessage, type GmailMessageStage } from '../../../db/schema';
import {
  GmailUnauthorizedError,
  modifyMessageLabels,
} from '../../../integrations/google/gmail.client';
import {
  ensureLabel,
  isLabelableStage,
} from '../../../integrations/google/labels';
import { getValidGoogleAccessToken } from '../../../integrations/google/oauth-tokens';
import { inngest } from '../../client';
import { inboxScanBatchClassified } from '../../events';
import { APPLY_LABELS_BATCH } from './consts';

export const applyLabelsBatch = inngest.createFunction(
  {
    id: APPLY_LABELS_BATCH.id,
    name: APPLY_LABELS_BATCH.name,
    triggers: [{ event: inboxScanBatchClassified }],
    concurrency: {
      limit: 1,
      key: 'event.data.userId',
    },
    retries: 3,
  },
  async ({ event, step, logger }) => {
    const { userId, batchIndex, batchesTotal, gmailMessageIds } = event.data;

    if (gmailMessageIds.length === 0) {
      return { applied: 0, reason: 'empty-batch' };
    }

    const accessToken = await step.run(
      APPLY_LABELS_BATCH.steps.loadAccount,
      async () => {
        try {
          const token = await getValidGoogleAccessToken(userId);
          return token.accessToken;
        } catch {
          // Token revoked between the batch classify and now. Skip
          // labels for this batch -- the classification still lives in
          // our DB and the user can re-trigger labeling later.
          return null;
        }
      },
    );
    if (!accessToken) {
      logger.warn(
        `apply-labels-batch: no token for user ${userId} batch ${batchIndex}/${batchesTotal}; skipping`,
      );
      return { skipped: true };
    }

    // Load this batch's classified rows. Filter to ones that haven't
    // already been labeled (idempotency under retry) and to labelable
    // stages.
    const rows = await step.run(APPLY_LABELS_BATCH.steps.loadRows, async () => {
      return db
        .select({
          id: gmailMessage.id,
          gmailMessageId: gmailMessage.gmailMessageId,
          stage: gmailMessage.stage,
        })
        .from(gmailMessage)
        .where(
          and(
            eq(gmailMessage.userId, userId),
            inArray(gmailMessage.gmailMessageId, gmailMessageIds),
            isNull(gmailMessage.appliedLabelIds),
          ),
        );
    });

    const todo = rows.filter((r) =>
      isLabelableStage(r.stage as GmailMessageStage),
    );
    if (todo.length === 0) {
      return { applied: 0, skipped: rows.length };
    }

    // Group by stage so ensureLabel runs at most once per stage in this
    // batch (typically 2-4 distinct stages across 40 messages).
    const byStage = new Map<GmailMessageStage, typeof todo>();
    for (const r of todo) {
      const stage = r.stage as GmailMessageStage;
      if (!byStage.has(stage)) byStage.set(stage, []);
      byStage.get(stage)!.push(r);
    }

    const labelIdByStage = new Map<GmailMessageStage, string>();
    await step.run(APPLY_LABELS_BATCH.steps.ensureLabels, async () => {
      for (const stage of byStage.keys()) {
        const id = await ensureLabel({ accessToken, userId, stage });
        if (id) labelIdByStage.set(stage, id);
      }
    });

    const applied = await step.run(
      APPLY_LABELS_BATCH.steps.applyLabels,
      async () => {
        let count = 0;
        for (const [stage, items] of byStage) {
          const labelId = labelIdByStage.get(stage);
          if (!labelId) continue;
          for (const item of items) {
            try {
              await modifyMessageLabels(
                accessToken,
                item.gmailMessageId,
                [labelId],
              );
              count += 1;
            } catch (err) {
              if (err instanceof GmailUnauthorizedError) {
                logger.warn(
                  `apply-labels-batch: token rejected mid-batch for user ${userId}; aborting`,
                );
                return count;
              }
              throw err;
            }
          }
        }
        return count;
      },
    );

    // Persist applied_label_ids so the modify call is idempotent under
    // retry and so the UI can render a "labels applied" indicator
    // without round-tripping Gmail.
    await step.run(APPLY_LABELS_BATCH.steps.persistLabelIds, async () => {
      for (const [stage, items] of byStage) {
        const labelId = labelIdByStage.get(stage);
        if (!labelId) continue;
        for (const item of items) {
          await db
            .update(gmailMessage)
            .set({ appliedLabelIds: [labelId] })
            .where(eq(gmailMessage.id, item.id));
        }
      }
    });

    return { applied };
  },
);
