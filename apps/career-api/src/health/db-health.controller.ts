import {
  Controller,
  Get,
  Inject,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { checkDatabase, type Database } from '@career/db';
import { DATABASE } from '../db/database.token';
import { DbHealthResponseDto } from './dto/db-health-response.dto';

@ApiTags('health')
@Controller('health/db')
export class DbHealthController {
  private readonly logger = new Logger(DbHealthController.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  @Get()
  @ApiOperation({
    operationId: 'getDatabaseHealth',
    summary: 'Database readiness probe',
    description:
      'Runs `SELECT 1` against Postgres and returns latency. Kept separate ' +
      'from the liveness probe (`/api/health`) so a database outage never ' +
      'fails the load-balancer health check and cycles healthy tasks.',
  })
  @ApiOkResponse({ type: DbHealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Database unreachable' })
  async check(): Promise<DbHealthResponseDto> {
    try {
      const { latencyMs } = await checkDatabase(this.db);
      return { status: 'ok', latencyMs };
    } catch (err) {
      this.logger.error(
        `database health check failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException('database unreachable');
    }
  }
}
