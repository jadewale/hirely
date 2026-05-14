import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HealthService } from '../health/health.service';
import { inngest } from '../inngest/client';
import { integrationsInboxConnected, resumesUploaded } from '../inngest/events';
import { functions } from '../inngest/functions';

/**
 * Builds MCP server instances on demand. Each HTTP request gets its own
 * server + transport pair (stateless mode), so we can't share a long-lived
 * server across requests — but tool handlers close over NestJS-injected
 * services, so they share the same DB pool, Inngest client, etc.
 *
 * Tools registered here are the agent-facing surface area. Rules:
 *   - Pure-read tools (e.g. `getHealth`, `listInngestFunctions`) should
 *     mirror HTTP endpoints where one exists, and have no side effects.
 *   - Write tools (e.g. `markInboxConnected`) should map 1:1 to a single
 *     domain event in `inngest/events.ts`. NEVER expose `user/created` —
 *     only Better Auth's sign-up hook is allowed to fire it, otherwise an
 *     agent could trigger phantom welcome emails for existing users.
 */

interface InngestEventRef {
  name?: string;
  event?: string;
}
interface InngestFunctionOpts {
  id: string;
  name?: string;
  triggers?: { event: InngestEventRef | string }[];
  cancelOn?: { event: InngestEventRef | string; if?: string }[];
}

const eventName = (ev: InngestEventRef | string | undefined): string =>
  typeof ev === 'string' ? ev : (ev?.name ?? ev?.event ?? '<unknown>');

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
      'listInngestFunctions',
      {
        title: 'List registered Inngest functions',
        description:
          'Returns every Inngest function the API has registered with the ' +
          'serve() handler — id, name, trigger event, and any cancelOn ' +
          'predicates. Useful for an agent to confirm a function exists, ' +
          'check what cancels it, or report on the onboarding sequence.',
      },
      () => {
        const items = functions.map((fn) => {
          const opts = (fn as { opts: InngestFunctionOpts }).opts;
          return {
            id: opts.id,
            name: opts.name ?? opts.id,
            triggers: (opts.triggers ?? []).map((t) => eventName(t.event)),
            cancelOn: (opts.cancelOn ?? []).map((c) => ({
              event: eventName(c.event),
              if: c.if,
            })),
          };
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
          structuredContent: { functions: items },
        };
      },
    );

    server.registerTool(
      'markInboxConnected',
      {
        title: 'Mark a user as having connected their inbox',
        description:
          'Fires the `integrations/inbox.connected` event for a user. This ' +
          'cancels any pending `onboarding-inbox-nudge` Inngest run for that ' +
          "user. Use when a user's inbox has been connected outside the " +
          'normal OAuth flow (manual support fix, migration, dev/test).',
        inputSchema: {
          userId: z
            .string()
            .min(1)
            .describe('The user.id (text) whose inbox was connected.'),
          provider: z
            .enum(['google', 'microsoft', 'imap'])
            .describe('Which provider the inbox was connected through.'),
        },
      },
      async ({ userId, provider }) => {
        const result = await inngest.send(
          integrationsInboxConnected.create({ userId, provider }),
        );
        return {
          content: [
            {
              type: 'text',
              text: `Fired integrations/inbox.connected for user ${userId} (provider=${provider}). Inngest ids: ${JSON.stringify(result.ids)}`,
            },
          ],
          structuredContent: { ids: result.ids, userId, provider },
        };
      },
    );

    server.registerTool(
      'markResumeUploaded',
      {
        title: 'Mark a user as having uploaded a resume',
        description:
          'Fires the `resumes/uploaded` event for a user. This cancels any ' +
          'pending `onboarding-resume-nudge` Inngest run for that user. Use ' +
          'when a resume is added outside the upload UI (manual support fix, ' +
          'migration, dev/test).',
        inputSchema: {
          userId: z
            .string()
            .min(1)
            .describe('The user.id (text) whose resume was uploaded.'),
          resumeId: z
            .string()
            .min(1)
            .describe('Identifier for the uploaded resume row.'),
        },
      },
      async ({ userId, resumeId }) => {
        const result = await inngest.send(
          resumesUploaded.create({ userId, resumeId }),
        );
        return {
          content: [
            {
              type: 'text',
              text: `Fired resumes/uploaded for user ${userId} (resumeId=${resumeId}). Inngest ids: ${JSON.stringify(result.ids)}`,
            },
          ],
          structuredContent: { ids: result.ids, userId, resumeId },
        };
      },
    );

    return server;
  }
}
