/**
 * Google OAuth token loader + refresher.
 *
 * Better Auth's `account` table is the source of truth for OAuth tokens:
 *   - accessToken          (Bearer for Google API calls; expires in ~1h)
 *   - refreshToken         (long-lived; granted because we set
 *                           accessType:"offline", prompt:"consent")
 *   - accessTokenExpiresAt (UTC timestamp)
 *
 * This helper is the only place outside of Better Auth that knows how to
 * read those columns and trade a refresh token for a fresh access token.
 * Anything that needs to talk to Gmail or Calendar goes through
 * `getValidGoogleAccessToken(userId)` and stays oblivious to the refresh
 * dance.
 *
 * Refresh strategy:
 *   - We refresh when the cached token expires in <= 60s. That buffer
 *     covers clock skew and the worst-case 30s round-trip of a Gmail
 *     batchGet so we don't get a 401 mid-request.
 *   - On refresh, we PERSIST the new access token + expiry back to the
 *     same `account` row. That way concurrent Inngest steps (and the
 *     /scan-status endpoint, and the next batch) all share one cached
 *     token instead of each refreshing independently and racing.
 *   - Google's refresh endpoint sometimes (rare, but documented) issues
 *     a new refresh_token. We persist it when it does -- losing a
 *     refresh token here is one of the few ways to make the integration
 *     un-fixable without re-prompting the user.
 */
import { and, eq } from 'drizzle-orm';

import { db } from '../../db';
import { account } from '../../db/schema';

const PROVIDER_ID = 'google';
const REFRESH_BUFFER_MS = 60 * 1000;
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export class GoogleAccountNotLinkedError extends Error {
  constructor(userId: string) {
    super(`User ${userId} has no linked Google account`);
    this.name = 'GoogleAccountNotLinkedError';
  }
}

export class GoogleTokenRefreshError extends Error {
  constructor(
    public readonly userId: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(
      `Google refused refresh for user ${userId}: HTTP ${status} ${body}`,
    );
    this.name = 'GoogleTokenRefreshError';
  }
}

export interface ValidGoogleAccessToken {
  /** Bearer value, ready to drop into an `Authorization` header. */
  accessToken: string;
  /** UTC ms when the token expires. */
  expiresAt: number;
  /** Whether we hit Google's refresh endpoint on this call. */
  refreshed: boolean;
  /** Account row id, useful for label/draft writebacks that key off it. */
  accountId: string;
}

/**
 * Returns a Bearer token that's guaranteed to be valid for >= 60s.
 *
 * Side effect: persists a refreshed token back to the `account` row so
 * subsequent callers get a cache hit. We accept the read-modify-write
 * race (two concurrent refreshes both writing) because Google's refresh
 * endpoint is idempotent for our purposes -- if both succeed the second
 * write just clobbers the first with an equally valid token. Worst case
 * we burn a few extra refresh API calls; we don't ever serve an invalid
 * token.
 */
export async function getValidGoogleAccessToken(
  userId: string,
): Promise<ValidGoogleAccessToken> {
  const rows = await db
    .select({
      id: account.id,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
    })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, PROVIDER_ID)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) throw new GoogleAccountNotLinkedError(userId);

  const now = Date.now();
  const expiresAt = row.accessTokenExpiresAt
    ? new Date(row.accessTokenExpiresAt).getTime()
    : 0;
  const cacheableToken = row.accessToken;

  if (cacheableToken && expiresAt - now > REFRESH_BUFFER_MS) {
    return {
      accessToken: cacheableToken,
      expiresAt,
      refreshed: false,
      accountId: row.id,
    };
  }

  // Expired or expiring within the buffer -> refresh.
  if (!row.refreshToken) {
    // We have a (possibly stale) access token but no way to get a fresh
    // one. This happens if the user signed in once with Google but the
    // app config didn't set accessType:"offline" at the time, OR if the
    // user revoked at myaccount.google.com/permissions and our column
    // was nulled. Surface a clear error so the caller can prompt a
    // re-link instead of silently failing API calls.
    throw new GoogleAccountNotLinkedError(userId);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET must be set to refresh tokens',
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new GoogleTokenRefreshError(userId, res.status, body);
  }

  const payload = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string; // Google occasionally rotates this
    scope?: string;
    token_type?: string;
  };

  const newExpiresAt = now + payload.expires_in * 1000;

  // Persist the fresh token (and possibly a rotated refresh token) so
  // the next caller hits the cache. We update by primary key, not by
  // (userId, providerId), to keep this race-safe -- the user can have
  // exactly one google account row.
  await db
    .update(account)
    .set({
      accessToken: payload.access_token,
      accessTokenExpiresAt: new Date(newExpiresAt),
      ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
      ...(payload.scope ? { scope: payload.scope } : {}),
    })
    .where(eq(account.id, row.id));

  return {
    accessToken: payload.access_token,
    expiresAt: newExpiresAt,
    refreshed: true,
    accountId: row.id,
  };
}
