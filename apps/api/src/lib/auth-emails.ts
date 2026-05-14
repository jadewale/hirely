/**
 * Email templates rendered for Better Auth's verify / reset / welcome flows.
 *
 * Kept deliberately minimal — plain inline HTML, no templating engine. When
 * design polish matters, swap these out for React Email or MJML; the call
 * sites in `auth.ts` only depend on the `{ subject, html, text }` shape.
 *
 * The brand name and a tiny bit of styling live in one place (`BRAND`,
 * `wrap()`) so every transactional email stays visually consistent.
 */
const BRAND = 'Hirely';

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const wrap = (innerHtml: string): string =>
  `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.55; color: #1a1a1a; max-width: 560px; margin: 32px auto; padding: 0 16px;">
${innerHtml}
<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
<p style="color: #888; font-size: 13px;">If you didn't request this email you can safely ignore it.</p>
<p style="color: #888; font-size: 13px;">— The ${BRAND} team</p>
</body></html>`;

const button = (href: string, label: string): string =>
  `<p style="margin: 24px 0;">
  <a href="${href}" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">${label}</a>
</p>
<p style="font-size: 13px; color: #555;">Or copy and paste this link into your browser:<br><a href="${href}">${href}</a></p>`;

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

export const welcomeEmail = (userName: string): RenderedEmail => ({
  subject: `Welcome to ${BRAND}`,
  html: wrap(
    `<h1 style="font-size: 22px; margin: 0 0 16px;">You're in, ${userName}.</h1>
<p>Thanks for joining ${BRAND}. Your account is ready — sign in any time and let us know if you hit anything weird.</p>`,
  ),
  text: `You're in, ${userName}.\n\nThanks for joining ${BRAND}. Your account is ready — sign in any time and let us know if you hit anything weird.\n— The ${BRAND} team`,
});
