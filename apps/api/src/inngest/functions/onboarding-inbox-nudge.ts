/**
 * Sends a "connect your inbox" nudge after a delay if the user hasn't
 * connected their inbox yet.
 *
 * The conditional check is handled entirely by Inngest's `cancelOn`: when
 * the integrations feature fires `integrations/inbox.connected` for the
 * same userId, this run is cancelled before the sleep wakes up. That means
 * no DB query is needed inside the function — fewer moving parts, no race
 * conditions between "did they connect in the last second?" and the email
 * actually being sent.
 *
 * If `cancelOn` cancels the run mid-sleep, no email goes out. If the sleep
 * completes, we're guaranteed the user hasn't connected an inbox.
 *
 * Tunable via `ONBOARDING_NUDGE_DELAY` (default 5d). Use a small value like
 * `30s` in dev/staging to exercise the path end-to-end without waiting.
 */
import { getEmailProvider } from '../../email/email.factory';
import { inboxNudgeEmail } from '../../lib/onboarding-emails';
import { inngest } from '../client';
import { integrationsInboxConnected, userCreated } from '../events';

const emailFrom = (): string =>
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

const nudgeDelay = (): string => process.env.ONBOARDING_NUDGE_DELAY ?? '5d';

export const onboardingInboxNudge = inngest.createFunction(
  {
    id: 'onboarding-inbox-nudge',
    name: 'Onboarding: inbox connection nudge',
    triggers: [{ event: userCreated }],
    cancelOn: [
      {
        event: integrationsInboxConnected,
        // CEL expression — cancel only if the cancel event's userId matches
        // the userId from this run's triggering `user/created` event. Without
        // this, ANY user connecting their inbox would cancel every pending
        // nudge for every other user.
        if: 'async.data.userId == event.data.userId',
      },
    ],
  },
  async ({ event, step }) => {
    await step.sleep('wait-before-nudge', nudgeDelay());

    await step.run('send-inbox-nudge', async () => {
      const provider = getEmailProvider();
      const tpl = inboxNudgeEmail(event.data.name);
      return provider.sendEmail({
        from: emailFrom(),
        to: event.data.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    });

    return { sentTo: event.data.email };
  },
);
