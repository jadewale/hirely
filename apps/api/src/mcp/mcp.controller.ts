import { Controller, Delete, Get, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpService } from './mcp.service';

/**
 * Exposes the MCP "Streamable HTTP" transport at `/api/mcp`.
 *
 * We run in stateless mode: every HTTP request gets a fresh `McpServer` and
 * `StreamableHTTPServerTransport`. This keeps the implementation trivial,
 * avoids server-side session state, and works with any MCP client that can
 * speak Streamable HTTP (including Cursor and Claude Desktop via a proxy).
 *
 * Excluded from OpenAPI because the route speaks JSON-RPC, not REST — its
 * contract is the MCP spec plus the tools registered in `McpService`.
 */
@ApiExcludeController()
@Controller('mcp')
export class McpController {
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
    const server = this.mcp.createServer();
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
}
