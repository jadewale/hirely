import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

// Unauthenticated: this is the ALB's health-check target. Without
// @AllowAnonymous the global AuthGuard would 401 it and ECS would cycle the task.
@AllowAnonymous()
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
