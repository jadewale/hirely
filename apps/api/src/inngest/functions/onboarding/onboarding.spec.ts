/**
 * Shape-only tests for the onboarding Inngest functions. We're not running
 * the handlers (that would need an Inngest dev server) — instead we assert
 * that each function is registered with the correct id, trigger, and (for
 * the nudges) cancelOn predicate. A typo in any of those silently breaks
 * the cancellation contract in prod with no error, so it's worth the line.
 *
 * Every assertion goes through the shared consts so renaming an id /
 * step propagates here automatically.
 */
import { functions } from '../index';
import {
  MATCH_USER_ID_EXPR,
  ONBOARDING_INBOX_NUDGE,
  ONBOARDING_RESUME_NUDGE,
  ONBOARDING_WELCOME,
} from './consts';
import { onboardingInboxNudge } from './inbox-nudge';
import { onboardingResumeNudge } from './resume-nudge';
import { onboardingWelcome } from './welcome';

interface EventLike {
  name?: string;
  event?: string;
}
interface OptsLike {
  id: string;
  name?: string;
  triggers?: { event: EventLike | string }[];
  cancelOn?: { event: EventLike | string; if?: string }[];
}
const optsOf = (fn: unknown): OptsLike => (fn as { opts: OptsLike }).opts;

// Pulls the underlying event name regardless of whether it was registered
// as a raw string ("user/created") or as an EventType carrier (which has
// a `name` field).
const eventName = (ev: EventLike | string | undefined): string | undefined => {
  if (!ev) return undefined;
  if (typeof ev === 'string') return ev;
  return ev.name ?? ev.event;
};

describe('onboarding Inngest functions', () => {
  it('all three are registered alongside helloWorld', () => {
    const ids = functions.map((fn) => optsOf(fn).id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'hello-world',
        ONBOARDING_WELCOME.id,
        ONBOARDING_INBOX_NUDGE.id,
        ONBOARDING_RESUME_NUDGE.id,
      ]),
    );
  });

  it('welcome triggers on user/created with no cancelOn', () => {
    const opts = optsOf(onboardingWelcome);
    expect(opts.id).toBe(ONBOARDING_WELCOME.id);
    expect(opts.name).toBe(ONBOARDING_WELCOME.name);
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(opts.cancelOn).toBeUndefined();
  });

  it('inbox nudge cancels on integrations/inbox.connected matching userId', () => {
    const opts = optsOf(onboardingInboxNudge);
    expect(opts.id).toBe(ONBOARDING_INBOX_NUDGE.id);
    expect(opts.name).toBe(ONBOARDING_INBOX_NUDGE.name);
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(eventName(opts.cancelOn?.[0].event)).toBe(
      'integrations/inbox.connected',
    );
    expect(opts.cancelOn?.[0].if).toBe(MATCH_USER_ID_EXPR);
  });

  it('resume nudge cancels on resumes/uploaded matching userId', () => {
    const opts = optsOf(onboardingResumeNudge);
    expect(opts.id).toBe(ONBOARDING_RESUME_NUDGE.id);
    expect(opts.name).toBe(ONBOARDING_RESUME_NUDGE.name);
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(eventName(opts.cancelOn?.[0].event)).toBe('resumes/uploaded');
    expect(opts.cancelOn?.[0].if).toBe(MATCH_USER_ID_EXPR);
  });
});
