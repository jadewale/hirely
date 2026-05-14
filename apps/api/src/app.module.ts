import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    EmailModule,
    HealthModule,
    McpModule,
  ],
})
export class AppModule {}
