/**
 * The driver function for a user's first inbox scan.
 *
 * Triggered by `integrations/inbox.connected`, which fires from Better
 * Auth's `databaseHooks.account.{create,update}.after` once Gmail scopes
 * are granted (see `apps/api/src/lib/auth.ts`).
 *
 * Shape:
 *
 *   1. Load a fresh access token + create the inbox_scan_progress row
 *      (state=listing).
 *   2. Page through `users/me/messages` with maxResults=40 until we've
 *      collected up to `INBOX_SCAN_INITIAL_TARGET` IDs OR Gmail runs out
 *      of pages. Each page is its own `step.run` so a retry doesn't
 *      re-list every page.
 *   3. Fan out: send one `integrations/inbox.scan.batch.requested` event
 *      per chunk of 40 IDs.
 *
 * The actual fetching of message bodies + classification + persistence
 * happens in `sync-inbox-batch.ts` (one Inngest run per batch). Splitting
 * along the fanout boundary keeps each function's runtime bounded -- a
 * single 300-message function would hold a step open for ~30s of LLM
 * latency, which works but blurs the failure surface. With the split,
 * "classify batch 5 failed" is a separate retryable unit from "list
 * page 3 failed".
 *
 * Idempotency:
 *   - Re-running the function for the same user is safe: the existing
 *     gmail_message rows are upserted by (userId, gmailMessageId).
 *   - Re-running while a previous scan is still in flight would race
 *     on inbox_scan_progress. We use `runId = ctx.runId` as the primary
 *     key, so two concurrent runs get two rows -- the latest one wins
 *     for the status endpoint. Acceptable for now; revisit if we add
 *     "rescan" UI.
 *
 * Cancellation:
 *   - This run is cancelled if the user's account is disconnected
 *     mid-scan (Phase 2D will emit a `disconnected` event with the
 *     same userId; we'll add a cancelOn here when that ships).
 */
import { eq } from 'drizzle-orm';

import { db } from '../../../db';
import { inboxScanProgress } from '../../../db/schema';
import {
  GoogleAccountNotLinkedError,
  getValidGoogleAccessToken,
} from '../../../integrations/google/oauth-tokens';
import { listMessages } from '../../../integrations/google/gmail.client';
import { hasGmailScopes } from '../../../integrations/google/scopes';
import { account } from '../../../db/schema';
import { and } from 'drizzle-orm';
import { inngest } from '../../client';
import {
  inboxScanBatchRequested,
  integrationsInboxConnected,
} from '../../events';
import {
  INBOX_SCAN_BATCH_SIZE,
  SYNC_INBOX_INITIAL,
  inboxScanInitialTarget,
} from './consts';

export const syncInboxInitial = inngest.createFunction(
  {
    id: SYNC_INBOX_INITIAL.id,
    name: SYNC_INBOX_INITIAL.name,
    triggers: [{ event: integrationsInboxConnected }],
    // Concurrency=1 per user. Prevents two inbox.connected events fired
    // in quick succession (e.g. user re-grants scopes within the same
    // session) from kicking off two parallel scans for the same user.
    concurrency: {
      limit: 1,
      key: 'event.data.userId',
    },
  },
  async ({ event, step, runId, logger }) => {
    const { userId, provider } = event.data;

    // Only process Google for now -- other providers (microsoft, imap)
    // will get their own driver fns when supported. Early-out keeps the
    // Inngest run history readable instead of cluttered with no-ops.
    if (provider !== 'google') {
      logger.info(
        `sync-inbox-initial: ignoring provider=${provider} for user ${userId}`,
      );
      return { skipped: true, provider };
    }

    // Step 1: Load a valid access token AND verify the user actually
    // granted Gmail scopes. The inbox.connected event is also fired for
    // calendar-only grants (we emit on any account update that gains
    // Gmail OR Calendar), so we double-check here to avoid false starts.
    const tokenContext = await step.run(
      SYNC_INBOX_INITIAL.steps.loadAccount,
      async () => {
        const accountScope = await db
          .select({ scope: account.scope })
          .from(account)
          .where(
            and(eq(account.userId, userId), eq(account.providerId, 'google')),
          )
          .limit(1);
        if (!hasGmailScopes(accountScope[0]?.scope ?? null)) {
          return { hasScope: false as const };
        }
        try {
          const token = await getValidGoogleAccessToken(userId);
          return { hasScope: true as const, accessToken: token.accessToken };
        } catch (err) {
          if (err instanceof GoogleAccountNotLinkedError) {
            return { hasScope: false as const };
          }
          throw err;
        }
      },
    );

    if (!tokenContext.hasScope) {
      logger.info(
        `sync-inbox-initial: user ${userId} lacks Gmail scopes; skipping scan`,
      );
      return { skipped: true, reason: 'no-gmail-scope' };
    }

    const accessToken = tokenContext.accessToken;
    const target = inboxScanInitialTarget();

    // Step 2: Insert (or replace) the progress row. Using the Inngest
    // runId as the PK means the dashboard polling endpoint can hand
    // out a stable identifier without us inventing one.
    await step.run(SYNC_INBOX_INITIAL.steps.createProgress, async () => {
      await db
        .insert(inboxScanProgress)
        .values({
          runId,
          userId,
          status: 'listing',
          targetTotal: target,
        })
        .onConflictDoUpdate({
          target: inboxScanProgress.runId,
          set: {
            status: 'listing',
            targetTotal: target,
            errorMessage: null,
          },
        });
    });

    // Step 3: Page through Gmail. Each page is its own step.run so a
    // retry of the function doesn't re-list every page we've already
    // succeeded on.
    const collected: string[] = [];
    let pageIndex = 0;
    let pageToken: string | undefined = undefined;

    while (collected.length < target) {
      const remaining = target - collected.length;
      const pageSize = Math.min(INBOX_SCAN_BATCH_SIZE, remaining);
      const page: { ids: string[]; nextPageToken: string | null } =
        await step.run(
          `${SYNC_INBOX_INITIAL.steps.listPage}-${pageIndex}`,
          async () => {
            return listMessages({
              accessToken,
              maxResults: pageSize,
              pageToken,
            });
          },
        );

      collected.push(...page.ids);
      pageIndex += 1;
      if (!page.nextPageToken || page.ids.length === 0) break;
      pageToken = page.nextPageToken;
    }

    const trimmed = collected.slice(0, target);

    // Step 4: Mark the discovery phase done -- the UI flips from
    // "Reading your inbox..." to "Analyzing N messages..." here.
    await step.run(SYNC_INBOX_INITIAL.steps.markListingDone, async () => {
      await db
        .update(inboxScanProgress)
        .set({
          status: 'classifying',
          discoveredTotal: trimmed.length,
          batchesTotal: Math.ceil(trimmed.length / INBOX_SCAN_BATCH_SIZE),
        })
        .where(eq(inboxScanProgress.runId, runId));
    });

    if (trimmed.length === 0) {
      // Empty inbox (or none of the queried categories matched). Mark
      // the scan as completed immediately so the UI advances to the
      // pipeline view (which will be empty -- fine).
      await db
        .update(inboxScanProgress)
        .set({
          status: 'completed',
          completedAt: new Date(),
          batchesCompleted: 0,
        })
        .where(eq(inboxScanProgress.runId, runId));
      return { discovered: 0, batches: 0 };
    }

    // Step 5: Fan out. Chunk into batches of INBOX_SCAN_BATCH_SIZE and
    // emit one event per batch. Inngest's batch send is more efficient
    // than N individual sends when N > ~5.
    const batches: string[][] = [];
    for (let i = 0; i < trimmed.length; i += INBOX_SCAN_BATCH_SIZE) {
      batches.push(trimmed.slice(i, i + INBOX_SCAN_BATCH_SIZE));
    }

    await step.run(SYNC_INBOX_INITIAL.steps.fanout, async () => {
      await inngest.send(
        batches.map((ids, batchIndex) =>
          inboxScanBatchRequested.create(
            {
              userId,
              runId,
              batchIndex,
              batchesTotal: batches.length,
              gmailMessageIds: ids,
            },
            { id: `${runId}-batch-${batchIndex}` },
          ),
        ),
      );
    });

    return { discovered: trimmed.length, batches: batches.length };
  },
);
