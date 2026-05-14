/**
 * Shape-only tests for the onboarding Inngest functions. We're not running
 * the handlers (that would need an Inngest dev server) — instead we assert
 * that each function is registered with the correct id, trigger, and (for
 * the nudges) cancelOn predicate. A typo in any of those silently breaks
 * the cancellation contract in prod with no error, so it's worth the line.
 */
import { functions } from './index';
import { onboardingInboxNudge } from './onboarding-inbox-nudge';
import { onboardingResumeNudge } from './onboarding-resume-nudge';
import { onboardingWelcome } from './onboarding-welcome';

interface EventLike {
  name?: string;
  event?: string;
}
interface OptsLike {
  id: string;
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
        'onboarding-welcome',
        'onboarding-inbox-nudge',
        'onboarding-resume-nudge',
      ]),
    );
  });

  it('welcome triggers on user/created with no cancelOn', () => {
    const opts = optsOf(onboardingWelcome);
    expect(opts.id).toBe('onboarding-welcome');
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(opts.cancelOn).toBeUndefined();
  });

  it('inbox nudge cancels on integrations/inbox.connected matching userId', () => {
    const opts = optsOf(onboardingInboxNudge);
    expect(opts.id).toBe('onboarding-inbox-nudge');
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(eventName(opts.cancelOn?.[0].event)).toBe(
      'integrations/inbox.connected',
    );
    expect(opts.cancelOn?.[0].if).toBe(
      'async.data.userId == event.data.userId',
    );
  });

  it('resume nudge cancels on resumes/uploaded matching userId', () => {
    const opts = optsOf(onboardingResumeNudge);
    expect(opts.id).toBe('onboarding-resume-nudge');
    expect(eventName(opts.triggers?.[0].event)).toBe('user/created');
    expect(eventName(opts.cancelOn?.[0].event)).toBe('resumes/uploaded');
    expect(opts.cancelOn?.[0].if).toBe(
      'async.data.userId == event.data.userId',
    );
  });
});
