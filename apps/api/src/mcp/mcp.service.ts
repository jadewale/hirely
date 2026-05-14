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
 * Auth model: the controller hands every `createServer()` call an
 * `McpAuthContext`. Tools choose their own posture:
 *
 *   - **Public**: read-only system info (`getHealth`, `listInngestFunctions`).
 *     Don't touch `auth.user`, work for anonymous and authenticated callers.
 *   - **User-scoped**: act on behalf of the caller. Wrap the handler in
 *     `requireUser(auth)` so anonymous callers get a clear "sign in" error
 *     instead of a 500 / silent no-op. NEVER take a `userId` parameter —
 *     pull it from the session.
 *   - (Future) **Admin-scoped**: same as user-scoped but checks an admin
 *     role; lets support engineers act on another user's behalf. Not in
 *     this slice — add an `admin` plugin to Better Auth when needed.
 *
 * `user/created` is still NOT exposed as a tool. Only Better Auth's
 * sign-up hook may fire it; an agent doing so would spawn phantom welcome
 * emails and start phantom nudge timers.
 */

export interface McpAuthUser {
  id: string;
  email: string;
  name: string;
}

export interface McpAuthContext {
  user: McpAuthUser | null;
}

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

// Throws a friendly MCP-level error when a user-scoped tool is called
// anonymously. The thrown message bubbles up to the MCP client as the
// tool result's error content — significantly more useful than a 500.
const requireUser = (auth: McpAuthContext): McpAuthUser => {
  if (!auth.user) {
    throw new Error(
      'This tool requires authentication. Send an Authorization: Bearer <session-token> header.',
    );
  }
  return auth.user;
};

@Injectable()
export class McpService {
  constructor(private readonly health: HealthService) {}

  createServer(auth: McpAuthContext): McpServer {
    const server = new McpServer({
      name: 'hirely-api',
      version: process.env.npm_package_version ?? '0.0.1',
    });

    // ── Public tools ────────────────────────────────────────────────────

    server.registerTool(
      'getHealth',
      {
        title: 'Get API health',
        description:
          'Returns the liveness + database probe payload that powers GET /api/health. Public — no auth required.',
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
          'predicates. Public read-only introspection.',
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

    // ── User-scoped tools ───────────────────────────────────────────────

    server.registerTool(
      'whoami',
      {
        title: 'Identify the authenticated user',
        description:
          'Returns id / email / name for the user resolved from the request. ' +
          'Use this to verify the bearer token pipeline is wired correctly. ' +
          'Requires an authenticated session.',
      },
      () => {
        const user = requireUser(auth);
        return {
          content: [{ type: 'text', text: JSON.stringify(user, null, 2) }],
          structuredContent: { ...user },
        };
      },
    );

    server.registerTool(
      'markMyInboxConnected',
      {
        title: 'Record that I connected my inbox',
        description:
          'Fires the `integrations/inbox.connected` event for the authenticated ' +
          'user. This cancels any pending `onboarding-inbox-nudge` Inngest run ' +
          'and unblocks any feature that waits for this signal. The user id is ' +
          'taken from the session — do NOT pass it explicitly.',
        inputSchema: {
          provider: z
            .enum(['google', 'microsoft', 'imap'])
            .describe('Which provider the inbox was connected through.'),
        },
      },
      async ({ provider }) => {
        const user = requireUser(auth);
        const result = await inngest.send(
          integrationsInboxConnected.create({ userId: user.id, provider }),
        );
        return {
          content: [
            {
              type: 'text',
              text: `Fired integrations/inbox.connected for ${user.email} (provider=${provider}). Inngest ids: ${JSON.stringify(result.ids)}`,
            },
          ],
          structuredContent: {
            ids: result.ids,
            userId: user.id,
            provider,
          },
        };
      },
    );

    server.registerTool(
      'markMyResumeUploaded',
      {
        title: 'Record that I uploaded a resume',
        description:
          'Fires the `resumes/uploaded` event for the authenticated user. ' +
          'This cancels any pending `onboarding-resume-nudge` Inngest run. ' +
          'The user id is taken from the session — do NOT pass it explicitly.',
        inputSchema: {
          resumeId: z
            .string()
            .min(1)
            .describe('Identifier for the uploaded resume row.'),
        },
      },
      async ({ resumeId }) => {
        const user = requireUser(auth);
        const result = await inngest.send(
          resumesUploaded.create({ userId: user.id, resumeId }),
        );
        return {
          content: [
            {
              type: 'text',
              text: `Fired resumes/uploaded for ${user.email} (resumeId=${resumeId}). Inngest ids: ${JSON.stringify(result.ids)}`,
            },
          ],
          structuredContent: {
            ids: result.ids,
            userId: user.id,
            resumeId,
          },
        };
      },
    );

    return server;
  }
}
