// Set placeholder env vars before AppModule is imported. DbModule
// instantiates the postgres client at module-load time (lazy connection),
// and Inngest needs INNGEST_DEV=1 to skip signing-key checks in tests.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.INNGEST_DEV ??= '1';

import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE')
      .useValue({ execute: () => Promise.resolve([{ '?column?': 1 }]) })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health -> 200 with ok status', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    const body = res.body as {
      status: string;
      db: string;
      uptime: number;
      timestamp: string;
    };
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('GET /api/docs-json -> OpenAPI spec listing /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json');
    const body = res.body as {
      openapi: string;
      info: { title: string };
      paths: Record<string, { get: { operationId: string } }>;
    };
    expect(res.status).toBe(200);
    expect(body.openapi).toMatch(/^3\./);
    expect(body.info.title).toBe('Hirely API');
    expect(Object.keys(body.paths)).toContain('/api/health');
    expect(body.paths['/api/health'].get.operationId).toBe('getHealth');
  });
});
