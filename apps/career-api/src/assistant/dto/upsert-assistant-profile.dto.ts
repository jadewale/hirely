import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger documentation for the `PUT /api/assistant/profile` body. Runtime
 * validation is done by `upsertAssistantProfileSchema` (@career/contracts) via
 * ZodValidationPipe — this class only shapes the OpenAPI document. Optional
 * fields accept `null` to clear a previously-set value.
 */
export class UpsertAssistantProfileDto {
  @ApiProperty({ example: 'Avery Assistant', maxLength: 120 })
  displayName!: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 160 })
  headline?: string | null;

  @ApiProperty({ required: false, nullable: true, maxLength: 4000 })
  bio?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'America/New_York' })
  timezone?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: Number,
    description: 'Hourly rate in minor units (cents)',
    example: 12000,
  })
  hourlyRateCents?: number | null;
}
