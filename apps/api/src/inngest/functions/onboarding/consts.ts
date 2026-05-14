/**
 * One source of truth for every onboarding Inngest function's id, name,
 * and the step / cancellation knobs they share.
 *
 * Keep this file boring — every constant here is referenced by the
 * function definition, the shape-spec test, the Inngest dashboard, and
 * (if we wire it up later) any UI or metrics keyed by the function id.
 * Renaming an id without updating every caller silently breaks
 * cancellation contracts and replay history, so we centralize.
 *
 * Naming convention:
 *   - Function id: `onboarding-<thing>` (kebab-case, no domain prefix)
 *   - Step ids:    `<verb>-<thing>` ("send-welcome-email", "wait-before-nudge")
 *
 * `as const` is intentional so id/name flow through as string literal
 * types — tests can `expect(opts.id).toBe(ONBOARDING_WELCOME.id)` and
 * stay type-safe.
 */

export const ONBOARDING_WELCOME = {
  id: 'onboarding-welcome',
  name: 'Onboarding: welcome email',
  steps: {
    send: 'send-welcome-email',
  },
} as const;

export const ONBOARDING_INBOX_NUDGE = {
  id: 'onboarding-inbox-nudge',
  name: 'Onboarding: inbox connection nudge',
  steps: {
    sleep: 'wait-before-nudge',
    send: 'send-inbox-nudge',
  },
} as const;

export const ONBOARDING_RESUME_NUDGE = {
  id: 'onboarding-resume-nudge',
  name: 'Onboarding: resume upload nudge',
  steps: {
    sleep: 'wait-before-nudge',
    send: 'send-resume-nudge',
  },
} as const;

// CEL expression for cancelOn predicates. Scopes a cancel event to the
// originating run's userId — without it, ANY user completing the action
// would cancel every pending nudge for every other user.
export const MATCH_USER_ID_EXPR = 'async.data.userId == event.data.userId';

// Default sleep duration before the inbox / resume nudges fire. Override
// per environment via `ONBOARDING_NUDGE_DELAY` (ms-style string: "5d",
// "1h30m", "30s"). Use a short value like "30s" in dev to exercise the
// path end-to-end without waiting 5 days.
export const ONBOARDING_NUDGE_DELAY_ENV = 'ONBOARDING_NUDGE_DELAY';
export const DEFAULT_ONBOARDING_NUDGE_DELAY = '5d';
