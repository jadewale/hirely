/**
 * Sends the post-signup welcome email.
 *
 * Triggered by `user/created`, which `lib/auth.ts` fires from Better Auth's
 * `databaseHooks.user.create.after` hook. Running this as an Inngest function
 * (rather than inline in the auth hook) gives us:
 *
 *   - Retries on transient SES failures without retrying sign-up.
 *   - A single home for every onboarding-related email (welcome lives next
 *     to the nudges that share the same trigger).
 *   - Observability — runs show up in the Inngest dashboard with payload,
 *     status, and replay support.
 */
import { getEmailProvider } from '../../email/email.factory';
import { welcomeEmail } from '../../lib/onboarding-emails';
import { inngest } from '../client';
import { userCreated } from '../events';

const emailFrom = (): string =>
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

export const onboardingWelcome = inngest.createFunction(
  {
    id: 'onboarding-welcome',
    name: 'Onboarding: welcome email',
    triggers: [{ event: userCreated }],
  },
  async ({ event, step }) => {
    await step.run('send-welcome-email', async () => {
      const provider = getEmailProvider();
      const tpl = welcomeEmail(event.data.name);
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
