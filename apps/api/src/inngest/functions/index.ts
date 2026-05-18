// Registry of every Inngest function the API serves.
// Add new functions here so the serve() handler picks them up automatically.

import { helloWorld } from './hello-world';
import {
  applyLabelsBatch,
  cleanupGoogleData,
  draftReplyFn,
  syncInboxBatch,
  syncInboxInitial,
  syncInboxProgress,
} from './inbox-sync';
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
  syncInboxInitial,
  syncInboxBatch,
  syncInboxProgress,
  applyLabelsBatch,
  draftReplyFn,
  cleanupGoogleData,
];
