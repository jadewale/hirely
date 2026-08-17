import { ApiProperty } from '@nestjs/swagger';
import type { AssistantStatus } from '@career/contracts';

/**
 * Swagger documentation for `PATCH /api/admin/assistants/:userId/status`.
 * Validated at runtime by `updateAssistantStatusSchema` (@career/contracts).
 */
export class UpdateAssistantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'], example: 'SUSPENDED' })
  status!: AssistantStatus;
}
