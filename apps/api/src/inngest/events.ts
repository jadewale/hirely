/**
 * Typed Inngest event catalog.
 *
 * Each exported `eventType(...)` is both the runtime event name AND a
 * TypeScript carrier for its payload shape. Use them everywhere:
 *
 *   - As triggers:   `triggers: [{ event: userCreated }]`
 *   - As cancel:     `cancelOn: [{ event: integrationsInboxConnected, if: ... }]`
 *   - When sending:  `inngest.send(userCreated.create({ ... }, { id: ... }))`
 *
 * Rules:
 * - Names are `<domain>/<verb-or-state>`. Past-tense for things that
 *   already happened (`integrations/inbox.connected`); present-tense
 *   imperative for explicit commands (none yet).
 * - Every event whose data is a user-scoped action MUST include
 *   `userId: string` so `cancelOn`/`if` predicates can pair it with the
 *   originating `user/created`.
 * - Don't change a payload's shape — add a new `v2` event instead so
 *   historical runs still match their original schema.
 * - `staticSchema<T>()` is a TS-only schema: types at compile time, no
 *   runtime validation. Swap to a Zod schema later if we want guarding
 *   at the Inngest boundary.
 */
import { eventType, staticSchema } from 'inngest';

// Fired by Better Auth's databaseHooks.user.create.after — kicks off the
// onboarding sequence (welcome, inbox-nudge, resume-nudge).
export const userCreated = eventType('user/created', {
  schema: staticSchema<{
    userId: string;
    email: string;
    name: string;
  }>(),
});

// Fired by the integrations feature once a user successfully OAuths /
// links their email inbox. Used to cancel `onboarding-inbox-nudge`.
export const integrationsInboxConnected = eventType(
  'integrations/inbox.connected',
  {
    schema: staticSchema<{
      userId: string;
      provider: 'google' | 'microsoft' | 'imap';
    }>(),
  },
);

// Fired by the resumes feature when a resume is uploaded or pasted.
// Used to cancel `onboarding-resume-nudge`.
export const resumesUploaded = eventType('resumes/uploaded', {
  schema: staticSchema<{
    userId: string;
    resumeId: string;
  }>(),
});

// Legacy / demo event used by the hello-world smoke function. Retained
// so dev-server walkthroughs keep working; safe to remove once we have
// a richer demo of the system.
export const demoHelloWorld = eventType('demo/hello.world', {
  schema: staticSchema<{ name?: string }>(),
});

// ─── Inbox scan pipeline ─────────────────────────────────────────────
//
// Two-function fanout that powers the initial 300-message backfill kicked
// off when a user grants Gmail scopes:
//
//   integrations/inbox.connected           (already emitted from auth hook)
//     └→ fn: sync-inbox-initial
//          ├→ pages through Gmail (40 IDs at a time, up to 300)
//          └→ sends one `inbox.scan.batch.requested` per batch
//
//   integrations/inbox.scan.batch.requested
//     └→ fn: sync-inbox-batch       (concurrency-limited)
//          ├→ batchGet message bodies from Gmail
//          ├→ classify via OpenAI in one call
//          ├→ upsert into gmail_message
//          └→ sends `inbox.scan.batch.classified` (drives progress UI)
//
//   integrations/inbox.scan.batch.classified
//     └→ fn: sync-inbox-progress    (single-flight per scan run)
//          └→ bumps inbox_scan_progress counters, marks completed if last
//
// The runId on every event ties the whole tree back to the row in
// `inbox_scan_progress` so the frontend can poll one stable identifier.

export const inboxScanBatchRequested = eventType(
  'integrations/inbox.scan.batch.requested',
  {
    schema: staticSchema<{
      userId: string;
      runId: string;
      batchIndex: number;
      batchesTotal: number;
      gmailMessageIds: string[];
    }>(),
  },
);

export const inboxScanBatchClassified = eventType(
  'integrations/inbox.scan.batch.classified',
  {
    schema: staticSchema<{
      userId: string;
      runId: string;
      batchIndex: number;
      batchesTotal: number;
      classifiedCount: number;
      /**
       * Just the Gmail message IDs that were classified in this batch.
       * Carried on the event so the labels-batch consumer doesn't have
       * to re-query the DB for them. 40 IDs * ~20 chars = ~1 KB; well
       * under Inngest's per-event size cap.
       */
      gmailMessageIds: string[];
    }>(),
  },
);

export const inboxScanCompleted = eventType(
  'integrations/inbox.scan.completed',
  {
    schema: staticSchema<{
      userId: string;
      runId: string;
      classifiedTotal: number;
    }>(),
  },
);

// ─── Drafts ──────────────────────────────────────────────────────────
//
// Per-thread draft requested by a user click in the Hirely UI. The HTTP
// controller emits this; the Inngest worker (draft-reply.ts) does the
// LLM call + Gmail draft creation. We split so the user gets an
// immediate 202 from the controller and the slower work runs in the
// background -- the UI polls a per-message `draft_status` column to
// know when the draft is ready.

export const threadsDraftRequested = eventType(
  'threads/draft.requested',
  {
    schema: staticSchema<{
      userId: string;
      /** Our internal gmailMessage.id (UUID), not the Gmail message id. */
      gmailMessageRowId: string;
    }>(),
  },
);

export const threadsDraftReady = eventType('threads/draft.ready', {
  schema: staticSchema<{
    userId: string;
    gmailMessageRowId: string;
    gmailDraftId: string;
  }>(),
});

// ─── Google disconnect ──────────────────────────────────────────────
//
// Emitted by the GoogleService.disconnect() endpoint after Google
// confirms the revoke. Triggers cleanup-google-data, which wipes every
// row Hirely persisted from the user's Gmail (gmail_message,
// gmail_label, inbox_scan_progress). Synchronous deletion is the
// safest answer for "Limited Use" compliance -- once the user revokes
// we have no business holding the data, and a 24h grace period is hard
// to justify under review.

export const googleDisconnected = eventType('integrations/google.disconnected', {
  schema: staticSchema<{
    userId: string;
    reason: 'user-initiated' | 'scope-loss' | 'admin-purge';
  }>(),
});
