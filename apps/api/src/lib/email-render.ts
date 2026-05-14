/**
 * Shared rendering primitives for transactional email templates.
 *
 * Every template ends up calling `wrap(...)` so the chrome (typography,
 * footer, brand) lives in one place. When we move to React Email or MJML
 * later, only this file changes — the call sites just rebind the same
 * `wrap` / `button` symbols.
 */
export const BRAND = 'Hirely';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export const wrap = (innerHtml: string): string =>
  `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.55; color: #1a1a1a; max-width: 560px; margin: 32px auto; padding: 0 16px;">
${innerHtml}
<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">
<p style="color: #888; font-size: 13px;">If you didn't request this email you can safely ignore it.</p>
<p style="color: #888; font-size: 13px;">— The ${BRAND} team</p>
</body></html>`;

export const button = (href: string, label: string): string =>
  `<p style="margin: 24px 0;">
  <a href="${href}" style="display: inline-block; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">${label}</a>
</p>
<p style="font-size: 13px; color: #555;">Or copy and paste this link into your browser:<br><a href="${href}">${href}</a></p>`;
