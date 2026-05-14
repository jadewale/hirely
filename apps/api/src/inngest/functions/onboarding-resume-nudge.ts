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
import { getEmailProvider } from '../../email/email.factory';
import { resumeNudgeEmail } from '../../lib/onboarding-emails';
import { inngest } from '../client';
import { resumesUploaded, userCreated } from '../events';

const emailFrom = (): string =>
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

const nudgeDelay = (): string => process.env.ONBOARDING_NUDGE_DELAY ?? '5d';

export const onboardingResumeNudge = inngest.createFunction(
  {
    id: 'onboarding-resume-nudge',
    name: 'Onboarding: resume upload nudge',
    triggers: [{ event: userCreated }],
    cancelOn: [
      {
        event: resumesUploaded,
        if: 'async.data.userId == event.data.userId',
      },
    ],
  },
  async ({ event, step }) => {
    await step.sleep('wait-before-nudge', nudgeDelay());

    await step.run('send-resume-nudge', async () => {
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
