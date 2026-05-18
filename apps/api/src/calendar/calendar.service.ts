/**
 * Calendar integration service.
 *
 * Wraps the calendar.client with input validation and scope-presence
 * checks. The controller stays thin; this is where the business rules
 * for "can this user even see calendar data?" + "did they pass us a
 * sane range?" live.
 *
 * We validate with Zod (already a project dep, no class-validator
 * decorators to keep DTOs lean for swagger).
 */
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import type { Database } from '../db';
import { account } from '../db/schema';
import {
  createEvent,
  queryFreeBusy,
} from '../integrations/google/calendar.client';
import { getValidGoogleAccessToken } from '../integrations/google/oauth-tokens';
import { hasCalendarScopes } from '../integrations/google/scopes';
import { CreateEventRequestDto, CreateEventResponseDto } from './dto/create-event.dto';
import { FreeBusyResponseDto } from './dto/free-busy.dto';

const PROVIDER_ID = 'google';
const MAX_FREEBUSY_RANGE_DAYS = 30;

const createEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  timeZone: z.string().optional(),
  attendees: z.array(z.string().email()).min(1),
  withMeet: z.boolean().optional(),
});

@Injectable()
export class CalendarService {
  constructor(@Inject('DATABASE') private readonly db: Database) {}

  /**
   * Returns the busy windows for the user's primary calendar between
   * `from` and `to`. The two timestamps are validated and bounded to
   * 30 days max -- arbitrarily-wide ranges are abuse-prone (and slow)
   * for a feature whose only legitimate use is "is this proposed
   * interview slot conflict-free?"
   */
  async getFreeBusy(opts: {
    userId: string;
    from: string;
    to: string;
    timeZone?: string;
  }): Promise<FreeBusyResponseDto> {
    await this.assertCalendarScope(opts.userId);
    const fromDate = parseDate(opts.from, 'from');
    const toDate = parseDate(opts.to, 'to');
    if (toDate <= fromDate) {
      throw new BadRequestException('`to` must be after `from`');
    }
    const rangeDays = (toDate.getTime() - fromDate.getTime()) / 86_400_000;
    if (rangeDays > MAX_FREEBUSY_RANGE_DAYS) {
      throw new BadRequestException(
        `Range too large (${rangeDays.toFixed(1)}d > ${MAX_FREEBUSY_RANGE_DAYS}d).`,
      );
    }

    const token = await getValidGoogleAccessToken(opts.userId);
    const result = await queryFreeBusy({
      accessToken: token.accessToken,
      timeMin: fromDate.toISOString(),
      timeMax: toDate.toISOString(),
      timeZone: opts.timeZone,
    });
    return { busy: result.busy };
  }

  /**
   * Creates an event on the user's primary calendar with attendees
   * + optional Google Meet link. The signed-in user is added to the
   * attendees list automatically -- the API takes the OTHER attendees
   * (typically just the recruiter).
   */
  async createEvent(opts: {
    userId: string;
    userEmail: string;
    body: CreateEventRequestDto;
  }): Promise<CreateEventResponseDto> {
    await this.assertCalendarScope(opts.userId);
    const parsed = createEventSchema.safeParse(opts.body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Invalid event payload',
        issues: parsed.error.flatten(),
      });
    }
    const start = parseDate(parsed.data.start, 'start');
    const end = parseDate(parsed.data.end, 'end');
    if (end <= start) {
      throw new BadRequestException('`end` must be after `start`');
    }

    const attendees = Array.from(
      // Dedupe in case the caller passes the user's own email by accident
      new Set(
        [...parsed.data.attendees, opts.userEmail].map((a) => a.toLowerCase()),
      ),
    );

    const token = await getValidGoogleAccessToken(opts.userId);
    const created = await createEvent(token.accessToken, {
      summary: parsed.data.summary,
      description: parsed.data.description,
      start: parsed.data.start,
      end: parsed.data.end,
      timeZone: parsed.data.timeZone,
      attendees,
      withMeet: parsed.data.withMeet ?? true,
    });
    return {
      id: created.id,
      hangoutLink: created.hangoutLink ?? null,
      htmlLink: created.htmlLink ?? null,
    };
  }

  /**
   * Guard. We refuse calendar calls for users who haven't granted
   * calendar.* scopes even if their access token would still work --
   * Google charges scope-level rejection back to our OAuth verification
   * record, so it's worth a cheap DB read up front.
   */
  private async assertCalendarScope(userId: string): Promise<void> {
    const rows = await this.db
      .select({ scope: account.scope })
      .from(account)
      .where(
        and(eq(account.userId, userId), eq(account.providerId, PROVIDER_ID)),
      )
      .limit(1);
    if (!hasCalendarScopes(rows[0]?.scope ?? null)) {
      throw new ForbiddenException(
        'Google Calendar not connected. Reconnect to grant the calendar.readonly and calendar.events scopes.',
      );
    }
  }
}

function parseDate(raw: string, label: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`\`${label}\` is not a valid ISO 8601 date`);
  }
  return d;
}
