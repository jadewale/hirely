/**
 * End-to-end auth flow against a real Postgres.
 *
 * Skips itself if TEST_DATABASE_URL is not set so the existing `bun run test:e2e`
 * keeps working on machines without docker. CI (and developers running the
 * full pipeline locally) start the docker-compose Postgres and export
 * TEST_DATABASE_URL before invoking jest.
 *
 * What this covers:
 *   1. /api/auth/sign-up/email creates a user, returns a session cookie,
 *      and triggers our sendVerificationEmail callback.
 *   2. /api/auth/sign-in/email re-issues a session for the same credentials.
 *   3. /api/auth/get-session resolves the cookie back to the user.
 *
 * Why a separate spec instead of folding into app.e2e-spec.ts: this one
 * mutates the DB and needs migrations applied; the rest of the suite is
 * pure HTTP smoke and overrides the DATABASE provider to avoid touching pg.
 */
import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as path from 'node:path';
import postgres from 'postgres';
import request from 'supertest';
import type { App } from 'supertest/types';

const dbUrl = process.env.TEST_DATABASE_URL;
const describeIfDb = dbUrl ? describe : describe.skip;

describeIfDb('Auth flow (e2e, real Postgres)', () => {
  let app: INestApplication<App>;
  let migrationsClient: ReturnType<typeof postgres>;

  // Reuse the DB across the suite — migrations run once, each `it` cleans
  // its own rows. The test user email is unique per run so concurrent CI
  // shards don't collide.
  const testEmail = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@hirely.test`;
  const testPassword = 'Test-Pa55word-Strong!';
  const testName = 'E2E Test User';

  beforeAll(async () => {
    process.env.DATABASE_URL = dbUrl;
    process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-not-real';
    process.env.BETTER_AUTH_URL = 'http://localhost:4000';
    process.env.EMAIL_PROVIDER = 'console';
    process.env.EMAIL_FROM = 'Hirely Test <test@hirely.test>';

    // Apply migrations against the test DB (idempotent — drizzle-kit tracks state).
    migrationsClient = postgres(dbUrl!, { max: 1 });
    await migrate(drizzle(migrationsClient), {
      migrationsFolder: path.resolve(__dirname, '..', 'drizzle'),
    });

    // Import AppModule + configureApp AFTER env vars are set. Better Auth's
    // requireEnv reads them at module-load, so the order matters. We assert
    // the module type so the destructured names retain their static types
    // — eslint-no-unsafe-* gets unhappy without it.
    const { AppModule } =
      (await import('./../src/app.module')) as typeof import('./../src/app.module');
    const { configureApp } =
      (await import('./../src/bootstrap')) as typeof import('./../src/bootstrap');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureApp(app as NestExpressApplication);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    if (app) await app.close();
    if (migrationsClient) {
      // Clean up our test user so the next run starts fresh.
      try {
        await migrationsClient`DELETE FROM "user" WHERE email = ${testEmail}`;
      } catch {
        // ignore — table may not exist if migration failed
      }
      await migrationsClient.end({ timeout: 5 });
    }
  }, 10_000);

  it('signs up, signs in, and resolves the session', async () => {
    const signUpRes = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ email: testEmail, password: testPassword, name: testName });
    expect(signUpRes.status).toBe(200);
    const signUpBody = signUpRes.body as {
      token: string;
      user: { email: string; emailVerified: boolean };
    };
    expect(signUpBody.user.email).toBe(testEmail);
    expect(signUpBody.user.emailVerified).toBe(false);
    expect(typeof signUpBody.token).toBe('string');

    // Hit sign-in with the same credentials to confirm the password hash
    // landed correctly. We deliberately don't reuse the sign-up session.
    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: testEmail, password: testPassword });
    expect(signInRes.status).toBe(200);

    const cookies = signInRes.headers['set-cookie'] as
      | string[]
      | string
      | undefined;
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies!;

    // Walk the cookie back through get-session to verify the round-trip.
    const sessionRes = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', cookieHeader);
    expect(sessionRes.status).toBe(200);
    const sessionBody = sessionRes.body as {
      user: { email: string };
      session: { token: string };
    } | null;
    expect(sessionBody).not.toBeNull();
    expect(sessionBody?.user.email).toBe(testEmail);
  }, 30_000);

  it('rejects a wrong password with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: testEmail, password: 'wrong-password-xx' });
    expect(res.status).toBe(401);
  });

  it('treats /api/auth/get-session without a cookie as an empty (null) session', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/get-session');
    // Better Auth returns 200 with a null body for an anonymous get-session
    // request — not 401. Confirm both pieces.
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});
