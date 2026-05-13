import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { inngest } from '../inngest/client';
import { HealthService } from '../health/health.service';

/**
 * Builds MCP server instances on demand. Each HTTP request gets its own
 * server + transport pair (stateless mode), so we can't share a long-lived
 * server across requests — but tool handlers close over NestJS-injected
 * services, so they share the same DB pool, Inngest client, etc.
 */
@Injectable()
export class McpService {
  constructor(private readonly health: HealthService) {}

  createServer(): McpServer {
    const server = new McpServer({
      name: 'hirely-api',
      version: process.env.npm_package_version ?? '0.0.1',
    });

    server.registerTool(
      'getHealth',
      {
        title: 'Get API health',
        description:
          'Returns the liveness + database probe payload that powers GET /api/health.',
      },
      async () => {
        const result = await this.health.check();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: { ...result },
        };
      },
    );

    server.registerTool(
      'sendInngestEvent',
      {
        title: 'Send Inngest event',
        description:
          'Fire an Inngest event by name with an optional JSON payload. ' +
          'The matching Inngest function (if any) runs asynchronously.',
        inputSchema: {
          name: z
            .string()
            .min(1)
            .describe('Event name, e.g. "demo/hello.world"'),
          data: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Event payload object. Defaults to {} when omitted.'),
        },
      },
      async ({ name, data }) => {
        const result = await inngest.send({ name, data: data ?? {} });
        return {
          content: [
            {
              type: 'text',
              text: `Sent event "${name}" -> ${JSON.stringify(result.ids)}`,
            },
          ],
          structuredContent: { ids: result.ids },
        };
      },
    );

    return server;
  }
}
