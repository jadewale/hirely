import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * DB-free e2e: the job routes sit behind the global AuthGuard, so anonymous
 * requests are rejected before any DB work. Browsing is open to any signed-in
 * role; create/update/delete are role-gated (verified locally against Postgres).
 */
describe('Jobs (e2e)', () => {
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

  it('rejects an anonymous browse (401)', async () => {
    await request(app.getHttpServer()).get('/api/jobs').expect(401);
  });

  it('rejects an anonymous create (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ title: 'X', company: 'Y' })
      .expect(401);
  });
});
