// Registry of every Inngest function the API serves.
// Add new functions here so the serve() handler picks them up automatically.

import { helloWorld } from './hello-world';
import {
  onboardingInboxNudge,
  onboardingResumeNudge,
  onboardingWelcome,
} from './onboarding';

export const functions = [
  helloWorld,
  onboardingWelcome,
  onboardingInboxNudge,
  onboardingResumeNudge,
];
