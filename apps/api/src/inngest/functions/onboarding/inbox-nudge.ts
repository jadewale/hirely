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
import { getEmailProvider } from '../../../email/email.factory';
import { inboxNudgeEmail } from '../../../lib/onboarding-emails';
import { inngest } from '../../client';
import { integrationsInboxConnected, userCreated } from '../../events';
import { MATCH_USER_ID_EXPR, ONBOARDING_INBOX_NUDGE } from './consts';
import { emailFrom, nudgeDelay } from './utils';

export const onboardingInboxNudge = inngest.createFunction(
  {
    id: ONBOARDING_INBOX_NUDGE.id,
    name: ONBOARDING_INBOX_NUDGE.name,
    triggers: [{ event: userCreated }],
    cancelOn: [
      {
        event: integrationsInboxConnected,
        if: MATCH_USER_ID_EXPR,
      },
    ],
  },
  async ({ event, step }) => {
    await step.sleep(ONBOARDING_INBOX_NUDGE.steps.sleep, nudgeDelay());

    await step.run(ONBOARDING_INBOX_NUDGE.steps.send, async () => {
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
