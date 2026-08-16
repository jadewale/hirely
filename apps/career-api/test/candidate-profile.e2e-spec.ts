import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * DB-free e2e: the candidate profile routes are behind the global AuthGuard, so
 * an anonymous request is rejected before any DB query. The authenticated
 * GET/PUT flow is verified locally against docker Postgres.
 */
describe('Candidate profile (e2e)', () => {
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

  it('rejects an anonymous GET /api/candidate/profile (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/candidate/profile')
      .expect(401);
  });

  it('rejects an anonymous PUT /api/candidate/profile (401)', async () => {
    await request(app.getHttpServer())
      .put('/api/candidate/profile')
      .send({ firstName: 'X' })
      .expect(401);
  });
});
