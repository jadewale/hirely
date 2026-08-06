import { Module } from '@nestjs/common';
import { DbHealthController } from './db-health.controller';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  // DbHealthController resolves the DATABASE token from the @Global DbModule.
  controllers: [HealthController, DbHealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
