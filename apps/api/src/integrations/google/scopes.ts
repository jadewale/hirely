/**
 * Google OAuth scopes Hirely asks for after sign-in.
 *
 * Sign-in itself uses Better Auth's default minimal scopes
 * (`openid email profile`). Reading inbox + writing calendar events is a
 * separate `linkSocial` round-trip so the scary consent screen only fires
 * when the user explicitly clicks "Connect Google" on the onboarding step,
 * not on first sign-in.
 *
 * Keep this list in sync with `apps/web/src/lib/google-scopes.ts` — both
 * sides reference the same string identifiers; mismatches mean the server
 * reports "not connected" even after a successful OAuth round-trip.
 *
 * If you add a scope here you MUST also:
 *   1. Enable the matching Google API in console.cloud.google.com (Gmail
 *      API or Calendar API).
 *   2. Add the scope to the OAuth consent screen for project hirely-495121.
 *   3. For restricted scopes (`gmail.modify`, `gmail.compose`,
 *      `gmail.readonly`), submit the app for verification when going past
 *      100 test users.
 */
export const GOOGLE_GMAIL_SCOPES = [
  // Read recruiter threads + classify by sender/content.
  'https://www.googleapis.com/auth/gmail.readonly',
  // Apply `Hirely / Interview` style labels so users stay organized in
  // their normal inbox.
  'https://www.googleapis.com/auth/gmail.labels',
  // Drop AI-drafted replies in Drafts. Nothing ever sends without the
  // user explicitly clicking send themselves.
  'https://www.googleapis.com/auth/gmail.compose',
  // Modify thread states (mark read, archive, move). Required for the
  // pipeline-write flow on the Reveal screen.
  'https://www.googleapis.com/auth/gmail.modify',
] as const;

export const GOOGLE_CALENDAR_SCOPES = [
  // Read existing events so we can detect interview conflicts.
  'https://www.googleapis.com/auth/calendar.readonly',
  // Create interview events on the user's primary calendar when a
  // recruiter proposes a time. Sensitive (not restricted) — lighter
  // Google verification than the broader `calendar` scope.
  'https://www.googleapis.com/auth/calendar.events',
] as const;

/** Full scope list passed to `authClient.linkSocial` from the web app. */
export const GOOGLE_INBOX_SCOPES: readonly string[] = [
  ...GOOGLE_GMAIL_SCOPES,
  ...GOOGLE_CALENDAR_SCOPES,
];

/**
 * Better Auth stores granted scopes in the `account.scope` text column as a
 * space-separated list (the wire format Google uses on the OAuth response).
 * This helper does a substring-style membership check so callers can ask
 * "does the user have Gmail read?" without manually splitting.
 */
export function accountScopeIncludes(
  scope: string | null,
  needle: string,
): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes(needle);
}

/** True iff every Gmail scope we requested is present on the account row. */
export function hasGmailScopes(scope: string | null): boolean {
  return GOOGLE_GMAIL_SCOPES.every((s) => accountScopeIncludes(scope, s));
}

/** True iff every Calendar scope we requested is present. */
export function hasCalendarScopes(scope: string | null): boolean {
  return GOOGLE_CALENDAR_SCOPES.every((s) => accountScopeIncludes(scope, s));
}
