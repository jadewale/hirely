/**
 * Deletes every Gmail-derived row Hirely persisted for a user after
 * they disconnect.
 *
 * Triggered by `integrations/google.disconnected`. Three steps, each
 * its own `step.run` so partial failures retry cleanly:
 *
 *   1. Delete gmail_message  -- classified messages and any cached
 *                               drafts.
 *   2. Delete gmail_label    -- the (userId, stage) -> gmailLabelId
 *                               cache. The labels themselves stay in
 *                               the user's Gmail account; they're the
 *                               user's data, we just lose our pointer.
 *   3. Delete inbox_scan_progress -- scan history rows.
 *
 * Order matters less than it might seem because none of the three
 * tables reference each other -- they're parallel children of `user`.
 * But we run them sequentially so the Inngest UI shows progress in a
 * sensible order during a manual replay.
 *
 * Why not just `ON DELETE CASCADE` from `user`? We want disconnect to
 * NOT delete the user. The user keeps their Hirely account, they just
 * lose the Google linkage and any derived rows. Cascading from `user`
 * would be wrong.
 */
import { eq } from 'drizzle-orm';

import { db } from '../../../db';
import {
  gmailLabel,
  gmailMessage,
  inboxScanProgress,
} from '../../../db/schema';
import { inngest } from '../../client';
import { googleDisconnected } from '../../events';
import { CLEANUP_GOOGLE_DATA } from './consts';

export const cleanupGoogleData = inngest.createFunction(
  {
    id: CLEANUP_GOOGLE_DATA.id,
    name: CLEANUP_GOOGLE_DATA.name,
    triggers: [{ event: googleDisconnected }],
    concurrency: {
      limit: 1,
      key: 'event.data.userId',
    },
    retries: 3,
  },
  async ({ event, step, logger }) => {
    const { userId, reason } = event.data;
    logger.info(
      `cleanup-google-data: starting for user=${userId} reason=${reason}`,
    );

    const messagesDeleted = await step.run(
      CLEANUP_GOOGLE_DATA.steps.deleteMessages,
      async () => {
        const rows = await db
          .delete(gmailMessage)
          .where(eq(gmailMessage.userId, userId))
          .returning({ id: gmailMessage.id });
        return rows.length;
      },
    );

    const labelsDeleted = await step.run(
      CLEANUP_GOOGLE_DATA.steps.deleteLabels,
      async () => {
        const rows = await db
          .delete(gmailLabel)
          .where(eq(gmailLabel.userId, userId))
          .returning({ id: gmailLabel.id });
        return rows.length;
      },
    );

    const progressDeleted = await step.run(
      CLEANUP_GOOGLE_DATA.steps.deleteProgress,
      async () => {
        const rows = await db
          .delete(inboxScanProgress)
          .where(eq(inboxScanProgress.userId, userId))
          .returning({ runId: inboxScanProgress.runId });
        return rows.length;
      },
    );

    logger.info(
      `cleanup-google-data: user=${userId} messages=${messagesDeleted} labels=${labelsDeleted} progress=${progressDeleted}`,
    );
    return { messagesDeleted, labelsDeleted, progressDeleted };
  },
);
