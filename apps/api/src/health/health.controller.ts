import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

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
  check(): Promise<HealthResponseDto> {
    return this.health.check();
  }
}
