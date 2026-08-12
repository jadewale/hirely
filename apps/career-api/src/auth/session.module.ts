import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';

/**
 * Authenticated session surface (GET /api/me). Better Auth's own routes
 * (/api/auth/*) are mounted globally by AuthModule.forRoot() in app.module.
 */
@Module({
  controllers: [SessionController],
})
export class SessionModule {}
