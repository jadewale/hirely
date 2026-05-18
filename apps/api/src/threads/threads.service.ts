/**
 * Read + side-effect surface for the user's classified email threads.
 *
 * This is the home of the pipeline view (the dashboard's primary data
 * source). Lives under /api/threads instead of /api/integrations/google
 * because the user-facing concept is a "thread in my pipeline," not
 * "a Gmail-flavored object" -- when we eventually add Microsoft/IMAP
 * the same thread schema will back them via a different ingest path.
 */
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import type { Database } from '../db';
import { gmailMessage } from '../db/schema';
import { inngest } from '../inngest/client';
import { threadsDraftRequested } from '../inngest/events';
import { ThreadRowDto } from './dto/thread-row.dto';

@Injectable()
export class ThreadsService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  /**
   * Returns every classified-and-labelable thread for the user, ordered
   * by `receivedAt` desc. Pipeline view groups by stage on the client.
   *
   * Excludes `unrelated` from the response -- we keep those rows in
   * the DB for audit/debug but they never surface to the UI.
   */
  async listForUser(userId: string): Promise<ThreadRowDto[]> {
    const rows = await this.db
      .select()
      .from(gmailMessage)
      .where(eq(gmailMessage.userId, userId))
      .orderBy(desc(gmailMessage.receivedAt));

    return rows
      .filter((r) => r.stage !== 'unrelated')
      .map(toDto);
  }

  /**
   * Single-row read. Used by the draft-status poll loop on the UI.
   */
  async getForUser(
    userId: string,
    gmailMessageRowId: string,
  ): Promise<ThreadRowDto> {
    const rows = await this.db
      .select()
      .from(gmailMessage)
      .where(
        and(
          eq(gmailMessage.id, gmailMessageRowId),
          eq(gmailMessage.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new NotFoundException('Thread not found');
    return toDto(row);
  }

  /**
   * Kicks off a draft generation for the given thread.
   *
   * Returns immediately with the current row (status flips to 'pending'
   * inside the Inngest fn). The web client polls `getForUser` to know
   * when status === 'ready' and surfaces a link to the Gmail draft.
   *
   * We deliberately do NOT do the OpenAI call or Gmail draft creation
   * inline -- both are slow and unreliable enough that we want them
   * behind Inngest's retry + observability surface.
   */
  async requestDraft(
    userId: string,
    gmailMessageRowId: string,
  ): Promise<ThreadRowDto> {
    const row = await this.getForUser(userId, gmailMessageRowId);
    if (row.draftStatus === 'ready' || row.draftStatus === 'pending') {
      return row; // idempotent: re-request returns current state
    }
    await inngest.send(
      threadsDraftRequested.create(
        { userId, gmailMessageRowId },
        // Dedupe on the row id so a double-click within the dedupe
        // window (default ~24h) only kicks off one run.
        { id: `${gmailMessageRowId}-draft-requested` },
      ),
    );
    return row;
  }
}

function toDto(
  r: typeof gmailMessage.$inferSelect,
): ThreadRowDto {
  return {
    id: r.id,
    gmailMessageId: r.gmailMessageId,
    gmailThreadId: r.gmailThreadId,
    sender: r.sender,
    senderEmail: r.senderEmail,
    subject: r.subject,
    snippet: r.snippet,
    receivedAt: r.receivedAt.toISOString(),
    stage: r.stage as ThreadRowDto['stage'],
    confidence: r.confidence,
    appliedLabelIds: r.appliedLabelIds ?? null,
    draftStatus: r.draftStatus as ThreadRowDto['draftStatus'],
    gmailDraftId: r.gmailDraftId,
    draftBody: r.draftBody,
    draftedAt: r.draftedAt ? r.draftedAt.toISOString() : null,
  };
}
