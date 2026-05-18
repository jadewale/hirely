import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation lives in CalendarService (Zod schema) rather than via
 * class-validator decorators -- keeps DTOs as pure transport types so
 * tools that read just the @nestjs/swagger metadata get the full
 * picture, and parsing stays in one place.
 */
export class CreateEventRequestDto {
  @ApiProperty({ description: 'Event title shown in Calendar + invites.' })
  summary!: string;

  @ApiProperty({
    required: false,
    description: 'Optional body. Markdown is NOT rendered; Calendar shows plain text.',
  })
  description?: string;

  @ApiProperty({ description: 'RFC3339 start datetime (with timezone).' })
  start!: string;

  @ApiProperty({ description: 'RFC3339 end datetime (with timezone).' })
  end!: string;

  @ApiProperty({
    required: false,
    description: "IANA timezone name (e.g. 'America/Los_Angeles'). Defaults to UTC.",
  })
  timeZone?: string;

  @ApiProperty({
    type: [String],
    description: 'Attendee email addresses. The signed-in user is added automatically.',
  })
  attendees!: string[];

  @ApiProperty({
    required: false,
    description: 'If true, attach an auto-generated Google Meet link to the event.',
    default: true,
  })
  withMeet?: boolean;
}

export class CreateEventResponseDto {
  @ApiProperty({ description: 'Google Calendar event id.' })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Google Meet conference URL, present when withMeet=true.',
  })
  hangoutLink!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Deep link into the user's Calendar UI for this event.",
  })
  htmlLink!: string | null;
}
