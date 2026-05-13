import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import type { Database } from '../db';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  @Get()
  @ApiOperation({
    operationId: 'getHealth',
    summary: 'Liveness + database probe',
    description:
      'Returns `ok` when the API can reach Postgres, `degraded` otherwise. ' +
      'Always returns HTTP 200 so it can be used as a cheap monitor target ' +
      'without alerting on transient DB blips.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  async check(): Promise<HealthResponseDto> {
    let dbStatus: 'up' | 'down' = 'down';
    try {
      await this.db.execute(sql`select 1`);
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      db: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
