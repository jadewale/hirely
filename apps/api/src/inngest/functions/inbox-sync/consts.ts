/**
 * Source of truth for every inbox-sync Inngest function's id, step ids,
 * and the tunable knobs that drive the scan size.
 *
 * Mirrors the layout of `../onboarding/consts.ts` so every Inngest domain
 * follows the same pattern: ids in one file, function logic stays narrow.
 *
 * Renaming an id without updating every caller silently breaks replay
 * history and the Inngest dashboard's correlation, so keep this file the
 * single import site.
 */

export const SYNC_INBOX_INITIAL = {
  id: 'sync-inbox-initial',
  name: 'Inbox sync: initial 300-message backfill',
  steps: {
    loadAccount: 'load-account',
    createProgress: 'create-progress-row',
    listPage: 'list-page', // suffixed with page index at runtime
    markListingDone: 'mark-discovery-complete',
    fanout: 'fanout-batches',
  },
} as const;

export const SYNC_INBOX_BATCH = {
  id: 'sync-inbox-batch',
  name: 'Inbox sync: classify one 40-message batch',
  steps: {
    loadAccount: 'load-account',
    fetchMessages: 'fetch-message-bodies',
    classify: 'classify-batch',
    persist: 'persist-classifications',
    notify: 'emit-batch-classified',
  },
} as const;

export const SYNC_INBOX_PROGRESS = {
  id: 'sync-inbox-progress',
  name: 'Inbox sync: progress aggregator',
  steps: {
    bumpCounters: 'bump-counters',
    maybeComplete: 'maybe-emit-completed',
  },
} as const;

export const APPLY_LABELS_BATCH = {
  id: 'apply-labels-batch',
  name: 'Inbox sync: apply Hirely labels to a classified batch',
  steps: {
    loadAccount: 'load-account',
    loadRows: 'load-rows',
    ensureLabels: 'ensure-labels',
    applyLabels: 'apply-labels',
    persistLabelIds: 'persist-label-ids',
  },
} as const;

export const DRAFT_REPLY = {
  id: 'draft-reply',
  name: 'Threads: generate a reply draft in Gmail Drafts',
  steps: {
    loadRow: 'load-row',
    loadAccount: 'load-account',
    fetchOriginal: 'fetch-original-message',
    generateBody: 'generate-reply-body',
    createDraft: 'create-gmail-draft',
    persistDraft: 'persist-draft-state',
    notify: 'emit-draft-ready',
  },
} as const;

/**
 * How many messages we attempt to backfill on the very first connect.
 *
 * 300 is the user's chosen first-time depth -- enough to populate a
 * demoable pipeline without saturating the LLM batch quota or making
 * the initial scan feel slow. Override per environment via the
 * `INBOX_SCAN_INITIAL_TARGET` env var (e.g. `50` in dev for fast
 * iteration loops; `1000` in staging for stress-testing).
 */
export const INBOX_SCAN_INITIAL_TARGET_ENV = 'INBOX_SCAN_INITIAL_TARGET';
export const INBOX_SCAN_INITIAL_TARGET_DEFAULT = 300;

/**
 * How many messages a single batch processes. Gmail's `users.messages.list`
 * caps `maxResults` at 500 but classification cost scales linearly with
 * batch size and we want each Inngest step to retry cheaply, so 40 is
 * the sweet spot: small enough to fit a JSON-mode response under 8K
 * tokens, large enough that a 300-message scan fans out into ~8 batches
 * (Inngest charges per step, not per byte).
 */
export const INBOX_SCAN_BATCH_SIZE = 40;

/**
 * Concurrency cap on the batch worker. Gmail's per-user API quota is
 * ~250 requests / user / second (well above what we need) but classifier
 * latency is what bounds wall-clock time. 3 in-flight batches gives the
 * frontend a smooth-feeling progress bar (~1 batch / 3-5s) without
 * stacking up retries on the OpenAI side if a transient 429 hits.
 */
export const INBOX_SCAN_BATCH_CONCURRENCY = 3;

export function inboxScanInitialTarget(): number {
  const raw = process.env[INBOX_SCAN_INITIAL_TARGET_ENV];
  if (!raw) return INBOX_SCAN_INITIAL_TARGET_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return INBOX_SCAN_INITIAL_TARGET_DEFAULT;
  return Math.min(n, 1000);
}
