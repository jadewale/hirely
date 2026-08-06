import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { db, pgClient } from '@career/db';
import { DATABASE } from './database.token';

/**
 * Thin Nest wrapper around the framework-agnostic `@career/db` client. Provides
 * the Drizzle `db` under the DATABASE token app-wide (@Global) and owns the
 * pool's lifecycle — closing it on shutdown so the postgres-js pool doesn't
 * keep the event loop alive after Nest stops (in prod on SIGTERM, in tests on
 * app.close()).
 */
@Global()
@Module({
  providers: [{ provide: DATABASE, useValue: db }],
  exports: [DATABASE],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  async onApplicationShutdown(signal?: string): Promise<void> {
    try {
      await pgClient.end({ timeout: 5 });
      if (signal) this.logger.log(`postgres pool closed (signal: ${signal})`);
    } catch (err) {
      this.logger.error(
        `error closing postgres pool: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
