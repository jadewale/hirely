import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    HealthModule,
    // Feature modules (auth, candidates, assistants, applications, …) are added
    // by their respective tickets. RR-003 adds the DB; auth is RR-005.
  ],
})
export class AppModule {}
