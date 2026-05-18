import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { auth } from '../../lib/auth';
import { GoogleStatusResponseDto } from './dto/google-status-response.dto';
import { InboxScanStatusResponseDto } from './dto/scan-status-response.dto';
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

  @Get('scan-status')
  @ApiOperation({
    operationId: 'getInboxScanStatus',
    summary:
      'Progress of the latest initial inbox scan for the signed-in user',
    description:
      'Polled by the onboarding "Scanning your inbox..." step at ~1.5s intervals. Use `status` to decide which UI state to show; use (classifiedCount / discoveredTotal) for the progress bar.',
  })
  @ApiOkResponse({ type: InboxScanStatusResponseDto })
  async getScanStatus(
    @Session() session: UserSession<typeof auth>,
  ): Promise<InboxScanStatusResponseDto> {
    return this.google.getScanStatus(session.user.id);
  }

  @Post('disconnect')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'disconnectGoogle',
    summary: "Revoke the user's Google grant and purge all Gmail-derived data",
    description:
      "Revokes the OAuth grant at Google, deletes the local account row, and queues an Inngest cleanup that wipes gmail_message + gmail_label + inbox_scan_progress for the user. Idempotent.",
  })
  async disconnect(
    @Session() session: UserSession<typeof auth>,
  ): Promise<{ revoked: boolean }> {
    return this.google.disconnect(session.user.id);
  }
}
