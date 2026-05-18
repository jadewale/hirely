import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { auth } from '../lib/auth';
import { ThreadRowDto } from './dto/thread-row.dto';
import { ThreadsService } from './threads.service';

@ApiTags('threads')
@Controller('threads')
export class ThreadsController {
  constructor(private readonly threads: ThreadsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listThreads',
    summary: 'Every classified, surface-worthy thread for the signed-in user',
    description:
      'Returns rows ordered by receivedAt desc. Excludes "unrelated" classifications. The dashboard groups client-side by `stage` to render the pipeline.',
  })
  @ApiOkResponse({ type: ThreadRowDto, isArray: true })
  async list(
    @Session() session: UserSession<typeof auth>,
  ): Promise<ThreadRowDto[]> {
    return this.threads.listForUser(session.user.id);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getThread',
    summary: 'Single thread by its internal row id',
    description:
      'Used by the draft-status poll loop on the UI. Polls every ~1s while draftStatus is "pending".',
  })
  @ApiParam({ name: 'id', description: 'gmail_message.id (UUID)' })
  @ApiOkResponse({ type: ThreadRowDto })
  async get(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
  ): Promise<ThreadRowDto> {
    return this.threads.getForUser(session.user.id, id);
  }

  @Post(':id/draft')
  @ApiOperation({
    operationId: 'requestThreadDraft',
    summary: 'Generate a reply draft for this thread in the user\'s Gmail Drafts folder',
    description:
      'Idempotent: re-requesting while status is pending or ready returns the current row without doing anything. Returns 200 immediately; the actual draft generation runs in the background via Inngest and lands in Gmail Drafts within ~5s. Poll GET /threads/:id to know when status flips to "ready".',
  })
  @ApiParam({ name: 'id', description: 'gmail_message.id (UUID)' })
  @ApiOkResponse({ type: ThreadRowDto })
  async requestDraft(
    @Session() session: UserSession<typeof auth>,
    @Param('id') id: string,
  ): Promise<ThreadRowDto> {
    return this.threads.requestDraft(session.user.id, id);
  }
}
