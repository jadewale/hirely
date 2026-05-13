import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [HealthModule],
  controllers: [McpController],
  providers: [McpService],
})
export class McpModule {}
