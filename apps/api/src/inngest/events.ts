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
