import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import type { Database } from '../../db';
import { account, inboxScanProgress } from '../../db/schema';
import { inngest } from '../../inngest/client';
import { googleDisconnected } from '../../inngest/events';
import { GoogleStatusResponseDto } from './dto/google-status-response.dto';
import { InboxScanStatusResponseDto } from './dto/scan-status-response.dto';
import { revokeGoogleGrant } from './oauth-tokens';
import { hasCalendarScopes, hasGmailScopes } from './scopes';

const PROVIDER_ID = 'google';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  /**
   * Returns whether the given user has linked Google, and which of the
   * scope groups (inbox / calendar) they've granted.
   *
   * Reads straight from Better Auth's `account` table — that's the
   * source of truth for "which scopes did Google return on the most
   * recent OAuth round-trip". We don't cache it; the row updates
   * whenever a token refresh happens or a linkSocial call adds scopes,
   * so the freshest read here is also the cheapest.
   */
  async getStatus(userId: string): Promise<GoogleStatusResponseDto> {
    const rows = await this.db
      .select({
        accountId: account.accountId,
        scope: account.scope,
      })
      .from(account)
      .where(
        and(eq(account.userId, userId), eq(account.providerId, PROVIDER_ID)),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        linked: false,
        email: null,
        inboxConnected: false,
        calendarConnected: false,
      };
    }

    // Better Auth doesn't store the Google email on the account row
    // separately — it's the user.email when the user signed in with
    // Google. We're scoping this endpoint to the auth'd user anyway, so
    // returning that value here is correct (and matches what the design
    // shows in the "Signed in as ..." header chip).
    return {
      linked: true,
      email: null,
      inboxConnected: hasGmailScopes(row.scope),
      calendarConnected: hasCalendarScopes(row.scope),
    };
  }

  /**
   * Latest inbox-scan progress row for the user.
   *
   * Returns an `idle`-status placeholder when no scan has ever started
   * (avoiding a 404 keeps the frontend polling loop simple: it can
   * always read .status without branching on HTTP status code first).
   */
  async getScanStatus(userId: string): Promise<InboxScanStatusResponseDto> {
    const rows = await this.db
      .select()
      .from(inboxScanProgress)
      .where(eq(inboxScanProgress.userId, userId))
      .orderBy(desc(inboxScanProgress.startedAt))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return {
        status: 'idle',
        runId: null,
        targetTotal: 0,
        discoveredTotal: 0,
        classifiedCount: 0,
        batchesTotal: 0,
        batchesCompleted: 0,
        completedAt: null,
        errorMessage: null,
      };
    }

    return {
      status: row.status as InboxScanStatusResponseDto['status'],
      runId: row.runId,
      targetTotal: row.targetTotal,
      discoveredTotal: row.discoveredTotal,
      classifiedCount: row.classifiedCount,
      batchesTotal: row.batchesTotal,
      batchesCompleted: row.batchesCompleted,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      errorMessage: row.errorMessage,
    };
  }

  /**
   * Disconnects the user's Google account.
   *
   * Sequence (each step idempotent so the whole flow is safe to retry):
   *
   *   1. Revoke at Google. After this no token from our OAuth client
   *      will be accepted for this user until they re-authorize.
   *   2. Delete the Better Auth account row. The user's Hirely
   *      session keeps working -- they just lose the Google linkage
   *      and have to re-authorize to use Gmail/Calendar features.
   *   3. Emit `integrations/google.disconnected`. The cleanup Inngest
   *      function consumes this and wipes gmail_message + gmail_label
   *      + inbox_scan_progress for the user.
   *
   * Why split steps (2) and (3)? The user-facing concern is "are my
   * tokens still active?" -- that's (1) + (2), done synchronously so
   * the response only returns after the grant is dead. Wiping derived
   * rows is allowed to take a few seconds and benefits from Inngest's
   * retry surface (a transient DB blip during deletion shouldn't fail
   * the user's disconnect click).
   */
  async disconnect(userId: string): Promise<{ revoked: boolean }> {
    // Step 1: revoke at Google. Errors here are real (token mismatch,
    // network issue) and surface to the user.
    await revokeGoogleGrant(userId);

    // Step 2: drop the account row. After this, getStatus reports
    // linked=false and the UI bumps the user back to the Connect step.
    const deleted = await this.db
      .delete(account)
      .where(
        and(eq(account.userId, userId), eq(account.providerId, PROVIDER_ID)),
      )
      .returning({ id: account.id });

    // Step 3: queue cleanup of derived data. We do NOT await the
    // cleanup itself -- the user's disconnect returns immediately,
    // Inngest handles the rest with retries and visibility.
    await inngest.send(
      googleDisconnected.create(
        { userId, reason: 'user-initiated' },
        { id: `${userId}-disconnect` },
      ),
    );

    this.logger.log(
      `disconnect: user=${userId} revoked=${deleted.length > 0}`,
    );
    return { revoked: deleted.length > 0 };
  }
}
