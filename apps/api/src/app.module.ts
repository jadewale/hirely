import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DbModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { HttpModule } from './http/http.module';
import { auth } from './lib/auth';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Mounts Better Auth at /api/auth/*, re-installs JSON + urlencoded body
    // parsers for every other route, and registers a global AuthGuard so any
    // controller without @AllowAnonymous() / @OptionalAuth() requires a
    // valid session.
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '10mb' },
        urlencoded: { limit: '10mb', extended: true },
        rawBody: true,
      },
    }),
    DbModule,
    HttpModule,
    EmailModule,
    HealthModule,
    McpModule,
  ],
})
export class AppModule {}
