import { Test } from '@nestjs/testing';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Database } from '../db';
import { HealthService } from '../health/health.service';
import { McpService } from './mcp.service';
import type { McpAuthContext, McpAuthUser } from './mcp.service';

const fakeDb = {
  execute: () => Promise.resolve([{ '?column?': 1 }]),
} as unknown as Database;

const fakeUser: McpAuthUser = {
  id: 'user_abc123',
  email: 'smoke@example.com',
  name: 'Smoke Test',
};

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

  const connectClient = async (mcp: McpService, auth: McpAuthContext) => {
    const server = mcp.createServer(auth);
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

  describe('tool surface', () => {
    it('exposes the same tool list for anonymous and authenticated callers', async () => {
      const mcp = await build();
      const expected = [
        'getHealth',
        'listInngestFunctions',
        'markMyInboxConnected',
        'markMyResumeUploaded',
        'whoami',
      ];

      for (const auth of [{ user: null }, { user: fakeUser }]) {
        const { client, close } = await connectClient(mcp, auth);
        const { tools } = await client.listTools();
        expect(tools.map((t) => t.name).sort()).toEqual(expected);
        await close();
      }
    });
  });

  describe('public tools', () => {
    it('getHealth returns structured content even when anonymous', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: null });

      const result = await client.callTool({ name: 'getHealth' });
      expect(result.structuredContent).toMatchObject({
        status: 'ok',
        db: 'up',
      });

      await close();
    });

    it('listInngestFunctions returns id/name/triggers/cancelOn for every registered function', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: null });

      const result = await client.callTool({ name: 'listInngestFunctions' });
      const payload = result.structuredContent as {
        functions: Array<{
          id: string;
          name: string;
          triggers: string[];
          cancelOn: { event: string; if?: string }[];
        }>;
      };

      const byId = Object.fromEntries(payload.functions.map((f) => [f.id, f]));
      expect(byId['onboarding-welcome']).toMatchObject({
        triggers: ['user/created'],
        cancelOn: [],
      });
      expect(byId['onboarding-inbox-nudge']).toMatchObject({
        triggers: ['user/created'],
        cancelOn: [
          {
            event: 'integrations/inbox.connected',
            if: 'async.data.userId == event.data.userId',
          },
        ],
      });
      expect(byId['onboarding-resume-nudge']).toMatchObject({
        triggers: ['user/created'],
        cancelOn: [
          {
            event: 'resumes/uploaded',
            if: 'async.data.userId == event.data.userId',
          },
        ],
      });

      await close();
    });
  });

  describe('user-scoped tools', () => {
    it('whoami returns the resolved session user', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: fakeUser });

      const result = await client.callTool({ name: 'whoami' });
      expect(result.structuredContent).toEqual(fakeUser);

      await close();
    });

    it('whoami refuses to run when the caller is anonymous', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: null });

      const result = (await client.callTool({ name: 'whoami' })) as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text ?? '').toMatch(/requires authentication/i);

      await close();
    });

    it('markMyInboxConnected refuses to run anonymously and does not need a userId arg', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: null });

      const result = (await client.callTool({
        name: 'markMyInboxConnected',
        arguments: { provider: 'google' },
      })) as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text ?? '').toMatch(/requires authentication/i);

      await close();
    });

    it('markMyResumeUploaded refuses to run anonymously', async () => {
      const mcp = await build();
      const { client, close } = await connectClient(mcp, { user: null });

      const result = (await client.callTool({
        name: 'markMyResumeUploaded',
        arguments: { resumeId: 'r_test' },
      })) as {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
      expect(result.isError).toBe(true);

      await close();
    });
  });
});
