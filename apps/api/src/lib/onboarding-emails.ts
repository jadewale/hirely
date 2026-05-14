/**
 * Templates for the post-signup onboarding sequence (welcome + nudges).
 *
 * These are rendered inside Inngest functions, not Better Auth callbacks.
 * If you want to tweak copy on any of them, change it here — every
 * `inngest/functions/onboarding-*.ts` file imports the matching helper.
 *
 * The frontend URL the buttons point at comes from `FRONTEND_URL`, with
 * a localhost fallback so dev still produces clickable links.
 */
import { BRAND, button, RenderedEmail, wrap } from './email-render';

const frontend = (): string =>
  process.env.FRONTEND_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

export const welcomeEmail = (userName: string): RenderedEmail => ({
  subject: `Welcome to ${BRAND}`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">You're in, ${userName}.</h1>
<p>Thanks for joining ${BRAND}. Your account is ready — head over to your dashboard to finish setting up.</p>
${button(`${frontend()}/dashboard`, 'Go to your dashboard')}`,
  ),
  text: `You're in, ${userName}.\n\nThanks for joining ${BRAND}. Your account is ready — head over to your dashboard to finish setting up:\n${frontend()}/dashboard\n\n— The ${BRAND} team`,
});

export const inboxNudgeEmail = (userName: string): RenderedEmail => ({
  subject: `Connect your inbox to get the most out of ${BRAND}`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">Hi ${userName} — one quick step.</h1>
<p>Connecting your inbox is how ${BRAND} finds the recruiter conversations and outreach already in flight. Without it, we're flying blind on your behalf.</p>
<p>It takes about 60 seconds and we only read messages, never send on your behalf without confirmation.</p>
${button(`${frontend()}/settings/integrations`, 'Connect your inbox')}`,
  ),
  text: `Hi ${userName},\n\nConnecting your inbox is how ${BRAND} finds the recruiter conversations and outreach already in flight. It takes about 60 seconds and we only read messages, never send on your behalf without confirmation.\n\nConnect it here:\n${frontend()}/settings/integrations\n\n— The ${BRAND} team`,
});

export const resumeNudgeEmail = (userName: string): RenderedEmail => ({
  subject: `Add your resume so ${BRAND} can match you to better roles`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">Hi ${userName} — let's get you matched.</h1>
<p>${BRAND}'s recommendations get noticeably sharper once we know your background. Drop in your resume and we'll start surfacing roles that actually fit.</p>
<p>You can upload a PDF or paste plain text — whatever's faster.</p>
${button(`${frontend()}/profile/resume`, 'Upload your resume')}`,
  ),
  text: `Hi ${userName},\n\n${BRAND}'s recommendations get noticeably sharper once we know your background. Drop in your resume and we'll start surfacing roles that actually fit.\n\nUpload here:\n${frontend()}/profile/resume\n\n— The ${BRAND} team`,
});
