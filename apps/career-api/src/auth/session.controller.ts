import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { auth } from '../lib/auth';
import { SessionResponseDto } from './dto/session-response.dto';

/**
 * Authenticated "who am I" endpoint. Not @AllowAnonymous, so the global
 * AuthGuard requires a valid session — an anonymous request gets 401. The
 * @Session() decorator resolves the Better Auth session, proving NestJS can
 * resolve the authenticated user (RR-005 acceptance).
 */
@ApiTags('auth')
@Controller('me')
export class SessionController {
  @Get()
  @ApiOperation({
    operationId: 'getCurrentUser',
    summary: 'Return the current authenticated user',
  })
  @ApiOkResponse({ type: SessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  me(@Session() session: UserSession<typeof auth>): SessionResponseDto {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }
}
