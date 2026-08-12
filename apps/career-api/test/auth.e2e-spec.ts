import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * Auth wiring, DB-free: the global AuthGuard rejects anonymous requests to a
 * protected route *before* any database query, so this runs in CI without a
 * live Postgres. The full sign-up/sign-in flow is verified locally against the
 * docker-compose database.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // bodyParser:false — AuthModule owns parser wiring (matches main.ts).
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request to a protected route (/api/me) with 401', async () => {
    await request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('leaves the liveness probe anonymous (200)', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });
});
