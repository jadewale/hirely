/**
 * Sends a "upload your resume" nudge after a delay if the user hasn't
 * uploaded one yet. See the inbox-nudge comment for why the conditional
 * lives in `cancelOn` instead of a runtime DB check.
 *
 * Cancellation event: `resumes/uploaded` — emit it from the resumes feature
 * once an upload finishes (PDF parsed, text saved, whichever ships first).
 * Until that feature exists, the nudge fires unconditionally after the
 * delay; that's intentionally OK because right now the people in the
 * system ARE the ones we want to nudge.
 */
import { getEmailProvider } from '../../../email/email.factory';
import { resumeNudgeEmail } from '../../../lib/onboarding-emails';
import { inngest } from '../../client';
import { resumesUploaded, userCreated } from '../../events';
import { MATCH_USER_ID_EXPR, ONBOARDING_RESUME_NUDGE } from './consts';
import { emailFrom, nudgeDelay } from './utils';

export const onboardingResumeNudge = inngest.createFunction(
  {
    id: ONBOARDING_RESUME_NUDGE.id,
    name: ONBOARDING_RESUME_NUDGE.name,
    triggers: [{ event: userCreated }],
    cancelOn: [
      {
        event: resumesUploaded,
        if: MATCH_USER_ID_EXPR,
      },
    ],
  },
  async ({ event, step }) => {
    await step.sleep(ONBOARDING_RESUME_NUDGE.steps.sleep, nudgeDelay());

    await step.run(ONBOARDING_RESUME_NUDGE.steps.send, async () => {
      const provider = getEmailProvider();
      const tpl = resumeNudgeEmail(event.data.name);
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
