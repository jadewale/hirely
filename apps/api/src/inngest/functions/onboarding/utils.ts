/**
 * Tiny helpers shared by every onboarding function. Pulled out so the
 * function files stay focused on their actual flow (sleep → send) and
 * env-var lookups live in exactly one place.
 */
import {
  DEFAULT_ONBOARDING_NUDGE_DELAY,
  ONBOARDING_NUDGE_DELAY_ENV,
} from './consts';

// Default sender address. Lives here (not in `consts.ts`) because it
// reads from env at call time — `consts.ts` is for literal values.
export const emailFrom = (): string =>
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

export const nudgeDelay = (): string =>
  process.env[ONBOARDING_NUDGE_DELAY_ENV] ?? DEFAULT_ONBOARDING_NUDGE_DELAY;
