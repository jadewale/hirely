import {
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { McpService } from './mcp.service';
import type { McpAuthContext } from './mcp.service';

/**
 * Exposes the MCP "Streamable HTTP" transport at `/api/mcp`.
 *
 * We run in stateless mode: every HTTP request gets a fresh `McpServer` and
 * `StreamableHTTPServerTransport`. This keeps the implementation trivial,
 * avoids server-side session state, and works with any MCP client that can
 * speak Streamable HTTP (including Cursor and Claude Desktop via a proxy).
 *
 * Auth model: the controller stays `@AllowAnonymous()` because MCP's
 * `tools/list` discovery must work without credentials — clients ask
 * "what's here?" before they ever send a token. Per-tool auth lives
 * inside `McpService`: handlers that need a user call `requireUser(auth)`
 * and throw a clear error when the caller is anonymous. The Better Auth
 * bearer plugin (enabled in `lib/auth.ts`) handles the actual token
 * verification when an `Authorization: Bearer <token>` header is present.
 *
 * Excluded from OpenAPI because the route speaks JSON-RPC, not REST — its
 * contract is the MCP spec plus the tools registered in `McpService`.
 */
@AllowAnonymous()
@ApiExcludeController()
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcp: McpService) {}

  @Post()
  async post(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handle(req, res);
  }

  @Get()
  async get(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handle(req, res);
  }

  @Delete()
  async delete(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handle(req, res);
  }

  private async handle(req: Request, res: Response): Promise<void> {
    const authContext = await this.resolveAuth(req);

    const server = this.mcp.createServer(authContext);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  // Build a `Headers` instance from express's plain header object and ask
  // Better Auth to resolve the session. Returns an empty auth context when
  // there's no session — the controller never rejects on missing creds;
  // individual tools enforce their own requirements.
  private async resolveAuth(req: Request): Promise<McpAuthContext> {
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) headers.set(key, value.join(', '));
        else if (typeof value === 'string') headers.set(key, value);
      }
      const session = await auth.api.getSession({ headers });
      if (!session?.user) return { user: null };
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      };
    } catch (err) {
      // A malformed Authorization header shouldn't 500 the MCP call — the
      // caller would get a confusing transport-level error. Log and proceed
      // anonymously; tools that need auth will throw cleanly.
      this.logger.warn(
        `MCP session resolution failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { user: null };
    }
  }
}
