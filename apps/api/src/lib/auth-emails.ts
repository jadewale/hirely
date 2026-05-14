/**
 * Templates rendered for Better Auth's verify / reset password flows.
 *
 * The welcome email used to live here too, but it moved into
 * `onboarding-emails.ts` when we routed all post-signup nudges through
 * Inngest. Verify / reset stay here because Better Auth invokes them
 * directly (synchronously, inside its background-task runner) and they
 * are conceptually different from the multi-step onboarding journey.
 */
import { BRAND, button, RenderedEmail, wrap } from './email-render';

export const verificationEmail = (
  userName: string,
  url: string,
): RenderedEmail => ({
  subject: `Verify your email for ${BRAND}`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">Welcome to ${BRAND}, ${userName}.</h1>
<p>Confirm the email address you signed up with by clicking the button below. The link expires in 1 hour.</p>
${button(url, 'Verify email')}`,
  ),
  text: `Welcome to ${BRAND}, ${userName}.\n\nConfirm your email by clicking the link below (it expires in 1 hour):\n${url}\n\nIf you didn't sign up, ignore this email.\n— The ${BRAND} team`,
});

export const resetPasswordEmail = (
  userName: string,
  url: string,
): RenderedEmail => ({
  subject: `Reset your ${BRAND} password`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">Reset your password</h1>
<p>Hi ${userName} — somebody (hopefully you) asked to reset your ${BRAND} password. Click the button below to choose a new one. The link expires in 1 hour.</p>
${button(url, 'Reset password')}`,
  ),
  text: `Hi ${userName},\n\nSomebody asked to reset your ${BRAND} password. Click the link below to choose a new one (it expires in 1 hour):\n${url}\n\nIf you didn't request this, ignore this email — your password stays the same.\n— The ${BRAND} team`,
});
