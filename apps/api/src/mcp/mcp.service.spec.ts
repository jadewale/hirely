import { Test } from '@nestjs/testing';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Database } from '../db';
import { HealthService } from '../health/health.service';
import { McpService } from './mcp.service';

const fakeDb = {
  execute: () => Promise.resolve([{ '?column?': 1 }]),
} as unknown as Database;

describe('McpService', () => {
  const build = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        McpService,
        HealthService,
        { provide: 'DATABASE', useValue: fakeDb },
      ],
    }).compile();
    return moduleRef.get(McpService);
  };

  const connectClient = async (mcp: McpService) => {
    const server = mcp.createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await client.connect(clientTransport);
    return {
      client,
      close: () => Promise.all([client.close(), server.close()]),
    };
  };

  it('exposes getHealth and sendInngestEvent tools', async () => {
    const mcp = await build();
    const { client, close } = await connectClient(mcp);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['getHealth', 'sendInngestEvent']);

    await close();
  });

  it('getHealth returns structured content from HealthService', async () => {
    const mcp = await build();
    const { client, close } = await connectClient(mcp);

    const result = await client.callTool({ name: 'getHealth' });
    expect(result.structuredContent).toMatchObject({
      status: 'ok',
      db: 'up',
    });

    await close();
  });
});
