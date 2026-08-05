import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    // Feature modules (auth, candidates, assistants, applications, …) are added
    // by their respective tickets. RR-001 ships only the health surface.
  ],
})
export class AppModule {}
