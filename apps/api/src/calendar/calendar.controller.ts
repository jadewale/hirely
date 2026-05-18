import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { auth } from '../lib/auth';
import { CalendarService } from './calendar.service';
import {
  CreateEventRequestDto,
  CreateEventResponseDto,
} from './dto/create-event.dto';
import { FreeBusyResponseDto } from './dto/free-busy.dto';

@ApiTags('calendar')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('free-busy')
  @ApiOperation({
    operationId: 'getFreeBusy',
    summary: "Busy windows on the user's primary calendar in a date range",
    description:
      "Powers the 'is this slot conflict-free?' UI affordance. Returns opaque windows (no event details) per Google's freebusy.query semantics.",
  })
  @ApiQuery({
    name: 'from',
    description: 'RFC3339 start of the range (inclusive).',
    example: '2026-05-20T00:00:00Z',
  })
  @ApiQuery({
    name: 'to',
    description: 'RFC3339 end of the range (exclusive). Range capped at 30 days.',
    example: '2026-05-27T00:00:00Z',
  })
  @ApiQuery({
    name: 'tz',
    required: false,
    description: 'IANA timezone (defaults to UTC).',
  })
  @ApiOkResponse({ type: FreeBusyResponseDto })
  async getFreeBusy(
    @Session() session: UserSession<typeof auth>,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tz') tz?: string,
  ): Promise<FreeBusyResponseDto> {
    if (!from || !to) {
      throw new BadRequestException('`from` and `to` query params are required');
    }
    return this.calendar.getFreeBusy({
      userId: session.user.id,
      from,
      to,
      timeZone: tz,
    });
  }

  @Post('events')
  @ApiOperation({
    operationId: 'createCalendarEvent',
    summary: "Create an event on the user's primary Calendar",
    description:
      'Adds the signed-in user as an attendee automatically. By default attaches a Google Meet link and sends invite emails to external attendees (the recruiter) but not to the user themselves.',
  })
  @ApiBody({ type: CreateEventRequestDto })
  @ApiOkResponse({ type: CreateEventResponseDto })
  async createEvent(
    @Session() session: UserSession<typeof auth>,
    @Body() body: CreateEventRequestDto,
  ): Promise<CreateEventResponseDto> {
    return this.calendar.createEvent({
      userId: session.user.id,
      userEmail: session.user.email,
      body,
    });
  }
}
