/**
 * Better Auth instance.
 *
 * This file is the source of truth for our authentication setup. The Better
 * Auth CLI reads it to (a) generate the Drizzle schema and (b) emit type
 * info, so keep the export named `auth` and keep the file importable without
 * a database connection (no top-level queries).
 */
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { Logger } from '@nestjs/common';
import { db } from '../db';
import { getEmailProvider } from '../email/email.factory';
import { inngest } from '../inngest/client';
import { integrationsInboxConnected, userCreated } from '../inngest/events';
import { hasGmailScopes } from '../integrations/google/scopes';
import { resetPasswordEmail, verificationEmail } from './auth-emails';
import { parseOrigins } from './origins';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value === 'unset') {
    throw new Error(
      `Missing required env var ${name}. Set it in apps/api/.env (dev) or SSM (prod).`,
    );
  }
  return value;
};

const optionalEnv = (name: string): string | undefined => {
  const value = process.env[name];
  if (!value || value === 'unset') return undefined;
  return value;
};

// Singletons built outside the Nest DI container — Better Auth's instance is
// constructed at module-load time, before DI exists. Using the shared
// `getEmailProvider()` keeps this surface in sync with `EmailModule` and the
// Inngest functions: flip EMAIL_PROVIDER and all three pick up the change.
const onboardingLogger = new Logger('AuthOnboarding');
const emailProvider = getEmailProvider();
const emailFrom =
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

// The first parsed FRONTEND_URL entry is the canonical web origin (prod
// list is "<prod>,<localhost-fallback>"). We use it to build absolute
// post-auth redirect URLs that work in emails -- where relative paths
// would resolve against the API host (api.mindoutreach.com) and 404.
const webOrigins = parseOrigins(
  process.env.FRONTEND_URL,
  'http://localhost:3000',
);
const webOrigin = webOrigins[0] ?? 'http://localhost:3000';
const emailVerificationCallbackURL = `${webOrigin}/onboarding`;

/**
 * Emits `integrations/inbox.connected` iff the account row has every
 * Gmail scope Hirely requests. Fires from both `account.create.after`
 * (initial OAuth) and `account.update.after` (linkSocial scope upgrade,
 * token refresh).
 *
 * Idempotent at the Inngest dedupe layer via a deterministic event id —
 * the token-refresh path will call this hundreds of times over a user's
 * lifetime; we want at most one nudge cancellation per Google account.
 */
async function emitInboxIfGranted(acct: {
  userId: string;
  providerId: string;
  scope?: string | null;
}): Promise<void> {
  if (acct.providerId !== 'google') return;
  if (!hasGmailScopes(acct.scope ?? null)) return;
  try {
    await inngest.send(
      integrationsInboxConnected.create(
        { userId: acct.userId, provider: 'google' },
        { id: `integrations-inbox-connected-${acct.userId}-google` },
      ),
    );
  } catch (err) {
    onboardingLogger.error(
      `inngest.send('integrations/inbox.connected') failed for user ${acct.userId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

export const auth = betterAuth({
  appName: 'Hirely',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  secret: requireEnv('BETTER_AUTH_SECRET'),
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Better Auth invokes this when a user requests a password reset via
    // POST /api/auth/forget-password. The `url` is fully-formed and points
    // at our /api/auth/reset-password endpoint with the token embedded.
    sendResetPassword: async ({ user, url }) => {
      const tpl = resetPasswordEmail(user.name, url);
      await emailProvider.sendEmail({
        from: emailFrom,
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    },
  },
  emailVerification: {
    // Fires automatically on sign-up. Users get an account immediately
    // (autoSignIn:true above) but their emailVerified flag stays false
    // until they click the link.
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // Where the user lands after Better Auth verifies the token. Without
    // this, Better Auth falls back to `${baseURL}/` (the API origin),
    // which 404s because Nest only registers `/api/*` routes. Point it
    // at the web origin so verified users land inside the onboarding
    // flow instead.
    callbackURL: emailVerificationCallbackURL,
    sendVerificationEmail: async ({ user, url }) => {
      const tpl = verificationEmail(user.name, url);
      await emailProvider.sendEmail({
        from: emailFrom,
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Kick off the onboarding sequence. We deliberately do NOT send the
        // welcome email inline here — it lives in an Inngest function so
        // (a) we can retry it on transient SES failures without retrying
        // sign-up and (b) it lives next to the inbox/resume nudges that
        // depend on the same `user/created` event for `cancelOn` matching.
        //
        // The event-id is set to `user-created-${userId}` so a duplicate
        // hook invocation (e.g. if Better Auth retries) becomes a no-op at
        // Inngest's dedupe layer instead of triggering two welcome runs.
        //
        // Errors are logged but swallowed: a flaky Inngest event-API
        // response must never block sign-up. Worst case the user is
        // created but never sees the welcome email — much better than the
        // alternative of failing the sign-up.
        after: async (user) => {
          try {
            await inngest.send(
              userCreated.create(
                {
                  userId: user.id,
                  email: user.email,
                  name: user.name,
                },
                { id: `user-created-${user.id}` },
              ),
            );
          } catch (err) {
            onboardingLogger.error(
              `inngest.send('user/created') failed for ${user.email}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        },
      },
    },
    // Fires every time Better Auth touches the `account` row: initial
    // OAuth sign-in, `linkSocial` scope upgrades, and silent token
    // refreshes. We watch the `scope` field for Gmail scopes; the
    // moment they appear we emit `integrations/inbox.connected` so
    // Inngest cancels the 5-day "connect your inbox" nudge.
    //
    // Idempotency: the event id is `integrations-inbox-connected-${userId}-google`,
    // so the dozens of refresh-token-driven re-fires this hook will see
    // over a user's lifetime collapse into a single Inngest event at
    // the dedupe layer. Calendar gets a sibling event later — for now
    // it rides on the same scope-grant since we ask for both at once.
    account: {
      create: { after: async (acct) => emitInboxIfGranted(acct) },
      update: { after: async (acct) => emitInboxIfGranted(acct) },
    },
  },
  socialProviders: {
    ...(optionalEnv('GOOGLE_CLIENT_ID') && optionalEnv('GOOGLE_CLIENT_SECRET')
      ? {
          google: {
            clientId: requireEnv('GOOGLE_CLIENT_ID'),
            clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
          },
        }
      : {}),
  },
  // Better Auth uses this for two things:
  //   1. CSRF protection: rejects POST /api/auth/* requests whose Origin
  //      header isn't in this list.
  //   2. Redirect validation: rejects social-sign-in requests whose
  //      callbackURL doesn't resolve to one of these origins with
  //      "Invalid callbackURL".
  //
  // FRONTEND_URL is a comma-separated list in prod, single value in dev,
  // and must match the CORS allowlist in bootstrap.ts -- otherwise the
  // browser passes CORS but Better Auth still 400s the request.
  trustedOrigins: [
    ...parseOrigins(process.env.FRONTEND_URL, 'http://localhost:3000'),
    process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  ],
  // The bearer plugin turns `Authorization: Bearer <session-token>` headers
  // into validated sessions, which is the auth path used by non-browser
  // clients (MCP tools, mobile apps, server-side automation). The token
  // itself is the same value Better Auth already returns in cookie form
  // from sign-up / sign-in; the plugin just teaches the auth pipeline to
  // accept it from a header too.
  plugins: [bearer()],
});

export type Auth = typeof auth;
