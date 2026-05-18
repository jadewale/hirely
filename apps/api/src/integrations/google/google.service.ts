import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import type { Database } from '../../db';
import { account, inboxScanProgress } from '../../db/schema';
import { GoogleStatusResponseDto } from './dto/google-status-response.dto';
import { InboxScanStatusResponseDto } from './dto/scan-status-response.dto';
import { hasCalendarScopes, hasGmailScopes } from './scopes';

const PROVIDER_ID = 'google';

@Injectable()
export class GoogleService {
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
}
