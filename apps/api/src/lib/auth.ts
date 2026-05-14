/**
 * Better Auth instance.
 *
 * This file is the source of truth for our authentication setup. The Better
 * Auth CLI reads it to (a) generate the Drizzle schema and (b) emit type
 * info, so keep the export named `auth` and keep the file importable without
 * a database connection (no top-level queries).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { Logger } from '@nestjs/common';
import { db } from '../db';
import { createEmailProvider } from '../email/email.factory';
import { createHttpClient } from '../http/http.factory';
import {
  resetPasswordEmail,
  verificationEmail,
  welcomeEmail,
} from './auth-emails';

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
// constructed at module-load time, before DI exists. Using the same factory
// functions that EmailModule / HttpModule rely on keeps the two surfaces in
// sync; flip EMAIL_PROVIDER / HTTP_CLIENT and both pick up the change.
const emailLogger = new Logger('AuthEmail');
const emailProvider = createEmailProvider(createHttpClient());
const emailFrom =
  process.env.EMAIL_FROM ?? 'Hirely <onboarding@mindoutreach.com>';

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
        // One-shot welcome email. Errors here are logged but swallowed —
        // a transient Resend hiccup must NOT block a sign-up from finishing.
        after: async (user) => {
          try {
            const tpl = welcomeEmail(user.name);
            await emailProvider.sendEmail({
              from: emailFrom,
              to: user.email,
              subject: tpl.subject,
              html: tpl.html,
              text: tpl.text,
            });
          } catch (err) {
            emailLogger.error(
              `welcome email failed for ${user.email}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        },
      },
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
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  ],
});

export type Auth = typeof auth;
