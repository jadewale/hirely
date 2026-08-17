import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * Assistant profile routes, DB-free: the global AuthGuard rejects anonymous
 * requests *before* any database query, so this runs in CI without Postgres.
 * The authenticated read/write behaviour is verified locally against the
 * docker-compose database (see the RR-010 acceptance steps). Role gating (403)
 * is covered by RolesGuard unit tests; full role e2e lands with RR-014.
 */
describe('Assistant profile (e2e)', () => {
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

  it('rejects anonymous GET /api/assistant/profile with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/assistant/profile')
      .expect(401);
  });

  it('rejects anonymous PUT /api/assistant/profile with 401', async () => {
    await request(app.getHttpServer())
      .put('/api/assistant/profile')
      .send({ displayName: 'Nope' })
      .expect(401);
  });

  it('rejects anonymous GET /api/admin/assistants/:userId/profile with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/assistants/user_1/profile')
      .expect(401);
  });

  it('rejects anonymous PATCH /api/admin/assistants/:userId/status with 401', async () => {
    await request(app.getHttpServer())
      .patch('/api/admin/assistants/user_1/status')
      .send({ status: 'SUSPENDED' })
      .expect(401);
  });
});
