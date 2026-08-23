import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * DB-free e2e: assignment routes (admin management + assistant delegated access)
 * sit behind the global AuthGuard, so anonymous requests are rejected before any
 * DB work. The full role-gated + delegated-permission flow is verified locally
 * against Postgres.
 */
describe('Assignments (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an anonymous admin list (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/assignments')
      .expect(401);
  });

  it('rejects an anonymous assistant delegated read (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/assistant/candidates/some-user-id/profile')
      .expect(401);
  });
});
