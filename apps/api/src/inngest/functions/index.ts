// Registry of every Inngest function the API serves.
// Add new functions here so the serve() handler picks them up automatically.

import { helloWorld } from './hello-world';
import { onboardingInboxNudge } from './onboarding-inbox-nudge';
import { onboardingResumeNudge } from './onboarding-resume-nudge';
import { onboardingWelcome } from './onboarding-welcome';

export const functions = [
  helloWorld,
  onboardingWelcome,
  onboardingInboxNudge,
  onboardingResumeNudge,
];
