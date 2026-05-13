import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Database } from '../db';

@Controller('health')
export class HealthController {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  @Get()
  async check() {
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
