import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    description: '`ok` when DB is reachable, `degraded` otherwise.',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({
    enum: ['up', 'down'],
    description: 'Last observed Postgres connectivity state.',
  })
  db!: 'up' | 'down';

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
