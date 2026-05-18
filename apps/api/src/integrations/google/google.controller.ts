import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { auth } from '../../lib/auth';
import { GoogleStatusResponseDto } from './dto/google-status-response.dto';
import { GoogleService } from './google.service';

@ApiTags('integrations')
@Controller('integrations/google')
export class GoogleController {
  constructor(private readonly google: GoogleService) {}

  @Get('status')
  @ApiOperation({
    operationId: 'getGoogleIntegrationStatus',
    summary: 'Whether the signed-in user has connected Google (inbox + calendar)',
    description:
      'Reads the granted OAuth scopes off the user\'s linked Google account and reports which scope groups (inbox, calendar) are present. The web client polls this after a `linkSocial` redirect to know whether to advance from "connect" to "scanning".',
  })
  @ApiOkResponse({ type: GoogleStatusResponseDto })
  async getStatus(
    @Session() session: UserSession<typeof auth>,
  ): Promise<GoogleStatusResponseDto> {
    const status = await this.google.getStatus(session.user.id);
    // The user table's email matches the Google account email when sign-in
    // was via Google; fall back to it so the "Signed in as <email>" header
    // chip on the Connect step is correctly populated.
    return { ...status, email: status.linked ? session.user.email : null };
  }
}
