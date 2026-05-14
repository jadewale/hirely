/**
 * Better Auth instance.
 *
 * This file is the source of truth for our authentication setup. The Better
 * Auth CLI reads it to (a) generate the Drizzle schema and (b) emit type
 * info, so keep the export named `auth` and keep the file importable without
 * a database connection (no top-level queries).
 *
 * Email-callback wiring (verify / password reset / welcome) lives behind the
 * EmailProvider adapter and is added in a follow-up slice — until then the
 * defaults are in place and users can sign up without verification.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db';

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

export const auth = betterAuth({
  appName: 'Hirely',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  secret: requireEnv('BETTER_AUTH_SECRET'),
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
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
