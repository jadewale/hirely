import { ApiProperty } from '@nestjs/swagger';

export class BusyWindowDto {
  @ApiProperty({ description: 'RFC3339 start of the busy window.' })
  start!: string;

  @ApiProperty({ description: 'RFC3339 end of the busy window.' })
  end!: string;
}

export class FreeBusyResponseDto {
  @ApiProperty({
    type: [BusyWindowDto],
    description:
      "Busy windows on the user's primary calendar in the queried range. Each window is opaque (no event titles) -- by design, to match what calendar.readonly's freebusy.query returns.",
  })
  busy!: BusyWindowDto[];
}
