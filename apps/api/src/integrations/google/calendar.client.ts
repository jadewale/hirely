/**
 * Thin Google Calendar REST client.
 *
 * Two endpoints we actually need for Phase 2C:
 *
 *   - freebusy.query  (calendar.readonly) -- aggregates busy windows
 *     across the user's primary calendar without leaking individual
 *     event details. We use this for the "is the user free at <time>"
 *     check that powers the "this slot conflicts with an existing
 *     event" UI affordance.
 *
 *   - events.insert    (calendar.events) -- creates a new event on
 *     the user's primary calendar with attendees, location, and a
 *     Google Meet conference link (Calendar auto-generates the link
 *     when conferenceDataVersion=1 and we set requestId).
 *
 * Same design as gmail.client.ts: no googleapis SDK, direct fetch,
 * typed error classes mirror the Gmail ones for consistent retry
 * handling.
 */

const CAL_BASE = 'https://www.googleapis.com/calendar/v3';

export class CalendarUnauthorizedError extends Error {
  constructor() {
    super('Calendar returned 401 -- access token rejected');
    this.name = 'CalendarUnauthorizedError';
  }
}

export class CalendarRateLimitedError extends Error {
  constructor(public readonly retryAfterSec?: number) {
    super('Calendar returned 429 -- rate limited');
    this.name = 'CalendarRateLimitedError';
  }
}

export class CalendarServerError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Calendar returned ${status}: ${body}`);
    this.name = 'CalendarServerError';
  }
}

export interface BusyWindow {
  /** ISO-8601 start with timezone. */
  start: string;
  /** ISO-8601 end with timezone. */
  end: string;
}

export interface FreeBusyResult {
  /** Always one entry: the user's primary calendar. */
  busy: BusyWindow[];
}

/**
 * Returns busy windows for the user's primary calendar between
 * `timeMin` and `timeMax`. Calendar will only return non-empty results
 * when the user has calendar.readonly scope.
 *
 * `timeMin` / `timeMax` MUST be RFC3339 with timezone offset. JS's
 * `Date.toISOString()` produces UTC ("Z") which Calendar accepts.
 */
export async function queryFreeBusy(opts: {
  accessToken: string;
  timeMin: string;
  timeMax: string;
  timeZone?: string;
}): Promise<FreeBusyResult> {
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      timeZone: opts.timeZone ?? 'UTC',
      items: [{ id: 'primary' }],
    }),
  });
  await throwCalendarError(res);

  const json = (await res.json()) as {
    calendars?: {
      primary?: { busy?: { start: string; end: string }[] };
    };
  };
  return {
    busy: json.calendars?.primary?.busy ?? [],
  };
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  /** RFC3339 start datetime. */
  start: string;
  /** RFC3339 end datetime. */
  end: string;
  timeZone?: string;
  /** Attendee email addresses. */
  attendees: string[];
  /**
   * If true, asks Calendar to provision a Google Meet link and attach
   * it to the event. The link comes back as part of the response.
   */
  withMeet?: boolean;
  /**
   * If provided, Calendar sends invite emails to attendees. We default
   * to 'externalOnly' so the user only spams real recruiters, not
   * themselves.
   */
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface CreatedEvent {
  id: string;
  /** Stable URL the user can paste into a calendar invite (e.g. https://meet.google.com/abc-defg-hij). */
  hangoutLink?: string;
  /** Direct deep link into the user's Calendar UI (e.g. https://calendar.google.com/calendar/event?eid=...). */
  htmlLink?: string;
}

export async function createEvent(
  accessToken: string,
  input: CreateEventInput,
): Promise<CreatedEvent> {
  const url = new URL(`${CAL_BASE}/calendars/primary/events`);
  if (input.withMeet) url.searchParams.set('conferenceDataVersion', '1');
  url.searchParams.set('sendUpdates', input.sendUpdates ?? 'externalOnly');

  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.start, timeZone: input.timeZone ?? 'UTC' },
    end: { dateTime: input.end, timeZone: input.timeZone ?? 'UTC' },
    attendees: input.attendees.map((email) => ({ email })),
  };

  if (input.withMeet) {
    body.conferenceData = {
      createRequest: {
        // requestId must be unique per-create to prevent dup-Meet
        // generation. crypto.randomUUID is more than enough entropy.
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  await throwCalendarError(res);

  const json = (await res.json()) as {
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
  };
  return {
    id: json.id,
    hangoutLink: json.hangoutLink,
    htmlLink: json.htmlLink,
  };
}

async function throwCalendarError(res: Response): Promise<void> {
  if (res.ok) return;
  if (res.status === 401) throw new CalendarUnauthorizedError();
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const retryAfterSec = retryAfter ? Number(retryAfter) : undefined;
    throw new CalendarRateLimitedError(
      Number.isFinite(retryAfterSec) ? retryAfterSec : undefined,
    );
  }
  const body = await res.text().catch(() => '<unreadable>');
  throw new CalendarServerError(res.status, body);
}
