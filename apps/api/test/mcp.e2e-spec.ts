// Set placeholder env vars before AppModule is imported.
process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.INNGEST_DEV ??= '1';

import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';

describe('MCP (e2e)', () => {
  let app: INestApplication;
  let baseUrl: URL;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE')
      .useValue({ execute: () => Promise.resolve([{ '?column?': 1 }]) })
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app as NestExpressApplication);
    await app.listen(0);
    const server = app.getHttpServer() as Server;
    const { port } = server.address() as AddressInfo;
    baseUrl = new URL(`http://127.0.0.1:${port}/api/mcp`);
  });

  afterEach(async () => {
    await app.close();
  });

  const connect = async () => {
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const transport = new StreamableHTTPClientTransport(baseUrl);
    await client.connect(transport);
    return client;
  };

  it('lists getHealth and sendInngestEvent tools', async () => {
    const client = await connect();
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual(['getHealth', 'sendInngestEvent']);
    } finally {
      await client.close();
    }
  });

  it('callTool getHealth returns structured health payload', async () => {
    const client = await connect();
    try {
      const result = await client.callTool({ name: 'getHealth' });
      expect(result.structuredContent).toMatchObject({
        status: 'ok',
        db: 'up',
      });
    } finally {
      await client.close();
    }
  });
});
