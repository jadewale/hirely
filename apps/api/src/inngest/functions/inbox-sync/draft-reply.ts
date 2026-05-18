/**
 * Per-thread reply-draft generator.
 *
 * The user clicks "Generate reply draft" in Hirely's pipeline view.
 * The HTTP controller emits `threads/draft.requested` with the
 * gmail_message row id; this function does the actual work in the
 * background:
 *
 *   1. Load the gmail_message row to know which thread we're drafting
 *      against. Bail if status is already 'ready' or 'pending' (so
 *      double-clicks don't fire two LLM calls).
 *   2. Mark the row as 'pending' so the UI flips to a spinner.
 *   3. Fetch the original message body fresh from Gmail (we don't keep
 *      bodies in our DB).
 *   4. Generate the reply via OpenAI.
 *   5. Create the draft in the user's Gmail Drafts folder.
 *   6. Persist gmailDraftId + body back to the row, status='ready'.
 *   7. Emit `threads/draft.ready` so the UI can stop polling.
 *
 * Exercises the gmail.compose scope (the create-draft call).
 *
 * Failure behavior: any step exception flips the row to 'failed' so
 * the UI can show a retry button. We do this in a Promise.catch on the
 * outermost step boundary -- otherwise an exception inside step.run
 * leaves the row stuck in 'pending'.
 */
import { and, eq } from 'drizzle-orm';

import { db } from '../../../db';
import {
  gmailMessage,
  type GmailMessageStage,
} from '../../../db/schema';
import {
  createDraft,
  getMessage,
} from '../../../integrations/google/gmail.client';
import { getValidGoogleAccessToken } from '../../../integrations/google/oauth-tokens';
import { draftReply } from '../../../integrations/openai/drafter';
import { inngest } from '../../client';
import {
  threadsDraftReady,
  threadsDraftRequested,
} from '../../events';
import { DRAFT_REPLY } from './consts';

export const draftReplyFn = inngest.createFunction(
  {
    id: DRAFT_REPLY.id,
    name: DRAFT_REPLY.name,
    triggers: [{ event: threadsDraftRequested }],
    concurrency: {
      // Per-user cap so one user spamming "Generate" can't starve
      // everyone else's drafts. Each draft is ~1-3s of OpenAI latency
      // plus a Gmail round-trip; 3 in-flight per user is plenty.
      limit: 3,
      key: 'event.data.userId',
    },
    retries: 2,
  },
  async ({ event, step, logger }) => {
    const { userId, gmailMessageRowId } = event.data;

    try {
      const row = await step.run(DRAFT_REPLY.steps.loadRow, async () => {
        const rows = await db
          .select({
            id: gmailMessage.id,
            gmailMessageId: gmailMessage.gmailMessageId,
            gmailThreadId: gmailMessage.gmailThreadId,
            sender: gmailMessage.sender,
            senderEmail: gmailMessage.senderEmail,
            subject: gmailMessage.subject,
            stage: gmailMessage.stage,
            draftStatus: gmailMessage.draftStatus,
          })
          .from(gmailMessage)
          .where(
            and(
              eq(gmailMessage.id, gmailMessageRowId),
              eq(gmailMessage.userId, userId),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      });
      if (!row) {
        return { skipped: true, reason: 'row-not-found' };
      }
      if (row.draftStatus === 'ready' || row.draftStatus === 'pending') {
        return { skipped: true, reason: `already-${row.draftStatus}` };
      }

      // Flip to pending so the UI's spinner appears even before the LLM
      // call completes. Outside step.run so concurrent dedupe of this
      // transition runs in <1ms; we don't need retries on a status
      // bump.
      await db
        .update(gmailMessage)
        .set({ draftStatus: 'pending' })
        .where(eq(gmailMessage.id, gmailMessageRowId));

      const accessToken = await step.run(
        DRAFT_REPLY.steps.loadAccount,
        async () => {
          const token = await getValidGoogleAccessToken(userId);
          return token.accessToken;
        },
      );

      const original = await step.run(
        DRAFT_REPLY.steps.fetchOriginal,
        async () => getMessage(accessToken, row.gmailMessageId),
      );

      const drafted = await step.run(
        DRAFT_REPLY.steps.generateBody,
        async () =>
          draftReply({
            originalFrom: original.from,
            originalSubject: original.subject,
            originalBody: original.body,
            stage: row.stage as GmailMessageStage,
          }),
      );

      const created = await step.run(DRAFT_REPLY.steps.createDraft, async () =>
        createDraft(accessToken, {
          threadId: row.gmailThreadId,
          to: row.senderEmail,
          // "Re: " idempotency: Gmail's thread view tolerates "Re: Re:"
          // gracefully but it looks bad. Strip an existing "Re:" prefix
          // before prepending our own.
          subject: row.subject.replace(/^re:\s*/i, '').replace(/^/, 'Re: '),
          bodyPlain: drafted.bodyPlain,
          inReplyToMessageId: row.gmailMessageId,
        }),
      );

      await step.run(DRAFT_REPLY.steps.persistDraft, async () => {
        await db
          .update(gmailMessage)
          .set({
            draftStatus: 'ready',
            gmailDraftId: created.draftId,
            draftBody: drafted.bodyPlain,
            draftedAt: new Date(),
          })
          .where(eq(gmailMessage.id, gmailMessageRowId));
      });

      await step.run(DRAFT_REPLY.steps.notify, async () => {
        await inngest.send(
          threadsDraftReady.create(
            { userId, gmailMessageRowId, gmailDraftId: created.draftId },
            { id: `${gmailMessageRowId}-draft-ready` },
          ),
        );
      });

      return { gmailDraftId: created.draftId };
    } catch (err) {
      // Reset to failed so the UI can show a retry. The Inngest run is
      // also marked failed via the rethrow below; both signals together
      // mean we can debug either by reading the UI or by replaying the
      // Inngest run from its dashboard.
      logger.error(
        `draft-reply: ${err instanceof Error ? err.message : String(err)}`,
      );
      await db
        .update(gmailMessage)
        .set({ draftStatus: 'failed' })
        .where(eq(gmailMessage.id, gmailMessageRowId));
      throw err;
    }
  },
);
