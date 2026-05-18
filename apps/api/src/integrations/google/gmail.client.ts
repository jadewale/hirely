/**
 * Thin Gmail REST client.
 *
 * We deliberately do NOT use `googleapis` (the official Node SDK). Two
 * reasons:
 *
 *   1. `googleapis` is ~25 MB on disk and 600+ ms cold-start, dragging
 *      in every Google product surface we'll never touch (Drive, Docs,
 *      Maps, ...). The runtime cost matters in ECS Fargate where cold
 *      starts factor into SLO.
 *   2. The SDK's auth abstraction wants its own OAuth2Client and stores
 *      tokens in its own cache. We already have Better Auth as the
 *      source of truth for tokens; juggling two caches is a recipe for
 *      "why did this user get logged out" bugs.
 *
 * So we hit the REST API directly with `fetch` and let
 * `getValidGoogleAccessToken` handle refresh.
 *
 * Surface needed for Phase 2A:
 *   - listMessages         (paginate IDs)
 *   - getMessage           (single message, METADATA or FULL)
 *   - batchGetMessages     (parallel getMessage across an array of IDs)
 *
 * Phase 2B will add:
 *   - createOrApplyLabel   (gmail.labels + gmail.modify)
 *   - createDraft          (gmail.compose)
 *
 * Errors:
 *   - 401 (token revoked mid-flight) -> bubble GmailUnauthorizedError so
 *     the Inngest fn can fail with a clear message instead of looping
 *     into refresh storms. Token refresh is upstream of this client.
 *   - 429 (rate limit) -> bubble GmailRateLimitedError. Callers wrap us
 *     in Inngest steps, so they get retries with backoff for free.
 *   - 5xx -> bubble GmailServerError; same retry-via-Inngest story.
 */

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1';

export class GmailUnauthorizedError extends Error {
  constructor() {
    super('Gmail returned 401 -- access token rejected');
    this.name = 'GmailUnauthorizedError';
  }
}

export class GmailRateLimitedError extends Error {
  constructor(public readonly retryAfterSec?: number) {
    super('Gmail returned 429 -- rate limited');
    this.name = 'GmailRateLimitedError';
  }
}

export class GmailServerError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Gmail returned ${status}: ${body}`);
    this.name = 'GmailServerError';
  }
}

export interface ListMessagesResult {
  /** Raw Gmail message IDs (no thread/body yet -- fetch separately). */
  ids: string[];
  /** Page cursor; pass to next listMessages call. Empty == end. */
  nextPageToken: string | null;
  /** Estimated total, supplied by Gmail. Approximate; never trust. */
  resultSizeEstimate?: number;
}

export interface ListMessagesOpts {
  /** OAuth Bearer token. */
  accessToken: string;
  /** Gmail's `maxResults` -- 1-500. We use 40 per Phase 2A. */
  maxResults: number;
  /** Cursor from a previous response, or undefined for first page. */
  pageToken?: string;
  /**
   * Gmail search query. Default scopes to the user's inbox (excludes
   * Sent, Trash, Drafts). Caller can pass a custom query to broaden
   * (e.g. include CATEGORY_PROMOTIONS) for richer demos.
   */
  q?: string;
}

export async function listMessages(
  opts: ListMessagesOpts,
): Promise<ListMessagesResult> {
  const url = new URL(`${GMAIL_BASE}/users/me/messages`);
  url.searchParams.set('maxResults', String(opts.maxResults));
  if (opts.pageToken) url.searchParams.set('pageToken', opts.pageToken);
  // Default query: messages in the inbox, regardless of read/unread. We
  // include CATEGORY_PERSONAL + CATEGORY_UPDATES because Gmail
  // auto-classifies many recruiter notes as Updates (LinkedIn,
  // Greenhouse, Lever); pulling only Primary would miss them.
  url.searchParams.set(
    'q',
    opts.q ?? 'in:inbox category:{primary updates personal}',
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${opts.accessToken}` },
  });
  await throwGmailError(res);

  const json = (await res.json()) as {
    messages?: { id: string; threadId: string }[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  };

  return {
    ids: (json.messages ?? []).map((m) => m.id),
    nextPageToken: json.nextPageToken ?? null,
    resultSizeEstimate: json.resultSizeEstimate,
  };
}

/**
 * Trimmed-down message shape we keep around. We deliberately do NOT
 * carry the full Gmail Message struct around: it's enormous and we'd
 * be tempted to persist the body.
 */
export interface GmailMessageSummary {
  id: string;
  threadId: string;
  /** Gmail-supplied preview, ~280 chars. Safe to store. */
  snippet: string;
  /** Header value of the From line, as Gmail returned it. */
  from: string;
  /** Just the address part, parsed out for indexing. */
  fromEmail: string;
  /** Subject header. */
  subject: string;
  /** Parsed Date header as UTC ms. */
  receivedAt: number;
  /** Decoded plain-text body (best-effort; empty if no text/plain part). */
  body: string;
}

export async function getMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailMessageSummary> {
  // format=FULL gets us headers + body. We don't use METADATA-only
  // because classification needs the body. We don't use RAW because
  // we'd then need to MIME-parse client-side -- FULL gives us the
  // already-parsed parts array.
  const url = new URL(`${GMAIL_BASE}/users/me/messages/${messageId}`);
  url.searchParams.set('format', 'FULL');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await throwGmailError(res);

  const json = (await res.json()) as RawGmailMessage;
  return parseMessage(json);
}

/**
 * Fetches N messages in parallel.
 *
 * Gmail also offers a real batch endpoint (`batch.gmail.googleapis.com`)
 * that takes multipart/mixed and packs N calls into 1 HTTP round-trip,
 * but the multipart machinery is painful and our concurrency cap
 * downstream (Inngest) bounds wall-clock time more than HTTP overhead.
 * Plain Promise.all keeps the code straightforward.
 *
 * If we ever hit aggregate latency walls (>10s for 40 messages) we
 * revisit and switch to multipart batch.
 */
export async function batchGetMessages(
  accessToken: string,
  messageIds: string[],
): Promise<GmailMessageSummary[]> {
  return Promise.all(messageIds.map((id) => getMessage(accessToken, id)));
}

// ─── internal helpers ────────────────────────────────────────────────

async function throwGmailError(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) throw new GmailUnauthorizedError();
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const retryAfterSec = retryAfter ? Number(retryAfter) : undefined;
    throw new GmailRateLimitedError(
      Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
    );
  }
  const body = await res.text().catch(() => '<unreadable>');
  throw new GmailServerError(res.status, body);
}

interface RawGmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string };
    parts?: RawGmailMessage['payload'][];
  };
}

function parseMessage(raw: RawGmailMessage): GmailMessageSummary {
  const headers = raw.payload?.headers ?? [];
  const header = (name: string): string =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    '';

  const fromHeader = header('From');
  const subject = header('Subject') || '(no subject)';
  const dateHeader = header('Date');
  const receivedAt = dateHeader ? Date.parse(dateHeader) : Date.now();

  // From header looks like:  "Jane Doe <jane@example.com>"  or just an
  // address. Pull the address out for indexing; the human-readable part
  // is what we render in the pipeline.
  const addrMatch = fromHeader.match(/<([^>]+)>/);
  const fromEmail = (addrMatch?.[1] ?? fromHeader).trim().toLowerCase();

  const body = extractPlainText(raw.payload);

  return {
    id: raw.id,
    threadId: raw.threadId,
    snippet: raw.snippet ?? '',
    from: fromHeader,
    fromEmail,
    subject,
    receivedAt,
    body,
  };
}

/**
 * Walks the parts tree looking for the first `text/plain` part and
 * base64url-decodes it. We DO NOT use `text/html` -- the classifier
 * does better on plain text and rendering HTML risks reviewer concerns
 * about whether we strip tracking pixels (we don't load remote content
 * at all because we never render the body in our UI -- only the snippet
 * Gmail already gave us).
 */
function extractPlainText(
  payload: RawGmailMessage['payload'] | undefined,
): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return base64UrlDecode(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  return '';
}

function base64UrlDecode(input: string): string {
  // Gmail uses URL-safe base64 (`-` and `_`) without padding. Bun/Node's
  // Buffer.from with 'base64' accepts standard alphabet; normalize first.
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}
