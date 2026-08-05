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
    summary: 'Liveness probe',
    description:
      'Returns `ok` with process uptime while the API is serving. Cheap, ' +
      'unauthenticated monitor target for the load balancer.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return this.health.check();
  }
}
