import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

/**
 * DB-free e2e: the résumé routes sit behind the global AuthGuard, so anonymous
 * requests are rejected before any DB or S3 work. The authenticated
 * upload/confirm/download/delete flow is verified locally against docker
 * Postgres + MinIO.
 */
describe('Résumés (e2e)', () => {
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

  it('rejects an anonymous list (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/candidate/resumes')
      .expect(401);
  });

  it('rejects an anonymous create (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/candidate/resumes')
      .send({
        fileName: 'x.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
      })
      .expect(401);
  });
});
