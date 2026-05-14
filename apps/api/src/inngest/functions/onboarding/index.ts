// Barrel for the onboarding Inngest functions. Importing from
// `./onboarding` gives `inngest/functions/index.ts` a single, stable
// surface — adding a new onboarding function only touches this file.

export { onboardingInboxNudge } from './inbox-nudge';
export { onboardingResumeNudge } from './resume-nudge';
export { onboardingWelcome } from './welcome';

export {
  DEFAULT_ONBOARDING_NUDGE_DELAY,
  MATCH_USER_ID_EXPR,
  ONBOARDING_INBOX_NUDGE,
  ONBOARDING_NUDGE_DELAY_ENV,
  ONBOARDING_RESUME_NUDGE,
  ONBOARDING_WELCOME,
} from './consts';
