/**
 * Better Auth instance — the single source of truth for career-platform
 * authentication (RR-005). The Better Auth CLI reads this file to generate the
 * Drizzle schema, so keep the export named `auth` and keep the module
 * importable without a live database connection (no top-level queries).
 *
 * RR-005 ships email + password only. Roles (RR-006), social providers, and
 * transactional email arrive in later tickets.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '@career/db';
import { parseOrigins } from './origins';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value || value === 'unset') {
    throw new Error(
      `Missing required env var ${name}. Set it in apps/career-api/.env (dev) or SSM (prod).`,
    );
  }
  return value;
};

const isProd = process.env.NODE_ENV === 'production';

// Comma-separated in prod (e.g. "https://app.career...,http://localhost:3100"),
// single value in dev. Must match the CORS allowlist in bootstrap.ts.
const webOrigins = parseOrigins(
  process.env.FRONTEND_URL,
  'http://localhost:3100',
);

export const auth = betterAuth({
  appName: 'Career Platform',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4100',
  secret: requireEnv('BETTER_AUTH_SECRET'),
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // No verification email yet (no email provider until a later ticket); users
    // are usable immediately. emailVerified stays false until verification lands.
  },
  // CSRF + redirect allowlist. FRONTEND_URL drives this and must match CORS.
  trustedOrigins: [
    ...webOrigins,
    process.env.BETTER_AUTH_URL ?? 'http://localhost:4100',
  ],
  advanced: {
    cookiePrefix: 'career',
    // Production cookie settings (documented in apps/career-api/.env.example):
    // Secure + SameSite=None so the session cookie survives the cross-subdomain
    // browser flow (app.career.<domain> -> api.career.<domain>). In dev both
    // sides are http://localhost so Secure is off and Lax is sufficient.
    // For the prod cross-subdomain cookie to be *shared*, set COOKIE_DOMAIN to
    // the registrable parent (e.g. ".career.mindoutreach.com").
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    },
    ...(isProd && process.env.COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: process.env.COOKIE_DOMAIN,
          },
        }
      : {}),
  },
});

export type Auth = typeof auth;
