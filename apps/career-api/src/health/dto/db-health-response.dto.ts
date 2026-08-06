import { ApiProperty } from '@nestjs/swagger';

export class DbHealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Database is reachable' })
  status!: 'ok';

  @ApiProperty({
    example: 3,
    description: 'Round-trip latency of the SELECT 1 probe, in milliseconds',
  })
  latencyMs!: number;
}
