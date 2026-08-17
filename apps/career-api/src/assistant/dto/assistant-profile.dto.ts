import { ApiProperty } from '@nestjs/swagger';
import type { AssistantStatus } from '@career/contracts';

/** Response shape for a single assistant profile (RR-010). */
export class AssistantProfileDto {
  @ApiProperty({ format: 'uuid', description: 'Profile id' })
  id!: string;

  @ApiProperty({ description: 'Better Auth user id of the assistant' })
  userId!: string;

  @ApiProperty({ example: 'Avery Assistant' })
  displayName!: string;

  @ApiProperty({ nullable: true, example: 'Ex-FAANG technical recruiter' })
  headline!: string | null;

  @ApiProperty({
    nullable: true,
    example: '10 years placing senior engineers.',
  })
  bio!: string | null;

  @ApiProperty({ nullable: true, example: 'America/New_York' })
  timezone!: string | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Hourly rate in minor units (cents)',
    example: 12000,
  })
  hourlyRateCents!: number | null;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' })
  status!: AssistantStatus;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}
