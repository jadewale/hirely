/**
 * Client-side mirror of `apps/api/src/integrations/google/scopes.ts`.
 *
 * These are the scopes we ask for in the `authClient.linkSocial` call on
 * the onboarding step 2 ("Connect Google"). Better Auth merges them with
 * the default sign-in scopes and redirects the browser to Google's
 * consent screen.
 *
 * IMPORTANT: keep this list byte-for-byte in sync with the API copy. The
 * server reads granted scopes off the account row and decides whether
 * the inbox/calendar are "connected" — if the strings here drift, the
 * status endpoint reports "not connected" even after a successful
 * round-trip.
 */
export const GOOGLE_GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
] as const;

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const GOOGLE_INBOX_SCOPES: readonly string[] = [
  ...GOOGLE_GMAIL_SCOPES,
  ...GOOGLE_CALENDAR_SCOPES,
];
