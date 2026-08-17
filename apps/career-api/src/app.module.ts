import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { SessionModule } from './auth/session.module';
import { AdminModule } from './admin/admin.module';
import { CandidateModule } from './candidate/candidate.module';
import { AuditModule } from './audit/audit.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    // Mounts Better Auth at /api/auth/*, wires body parsers, and registers a
    // GLOBAL AuthGuard — so every route without @AllowAnonymous() requires a
    // valid session. main.ts must create the app with `bodyParser: false` so
    // this owns the parser wiring.
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '10mb' },
        urlencoded: { limit: '10mb', extended: true },
        rawBody: true,
      },
    }),
    HealthModule,
    SessionModule,
    AdminModule,
    CandidateModule,
    AuditModule,
    AssistantModule,
    // Feature modules (candidates, assistants, applications, …) are added by
    // their respective tickets. RR-005 auth; RR-006 roles.
  ],
})
export class AppModule {}
