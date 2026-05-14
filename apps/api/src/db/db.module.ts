import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { db, pgClient } from './index';

const DB_PROVIDER = {
  provide: 'DATABASE',
  useValue: db,
};

@Global()
@Module({
  providers: [DB_PROVIDER],
  exports: [DB_PROVIDER],
})
export class DbModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DbModule.name);

  // Fires on app.close() (tests) and on SIGTERM/SIGINT once
  // app.enableShutdownHooks() is on (configured in bootstrap.ts).
  // Without this the postgres-js pool keeps the event loop alive
  // after Nest has otherwise shut down.
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
