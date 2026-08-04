import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    enum: ['ok'],
    description:
      'Liveness marker. Always `ok` while the process is serving. A DB ' +
      'connectivity probe is added to this response in RR-003.',
  })
  status!: 'ok';

  @ApiProperty({
    description: 'Process uptime in seconds since boot.',
    example: 123.45,
  })
  uptime!: number;

  @ApiProperty({
    description: 'ISO-8601 timestamp from the API container.',
    example: '2026-05-12T12:34:56.789Z',
  })
  timestamp!: string;
}
