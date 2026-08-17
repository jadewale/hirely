import { ApiProperty } from '@nestjs/swagger';
import type { AuditEntry } from '@career/contracts';

/**
 * Swagger response shape for a single audit entry — mirrors `auditEntrySchema`
 * in `@career/contracts`. Redeclared as a class so `@nestjs/swagger` can emit
 * OpenAPI metadata (Zod schemas alone don't produce that).
 */
export class AuditEntryDto implements AuditEntry {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({
    enum: ['CANDIDATE', 'ASSISTANT', 'ADMIN'],
    nullable: true,
  })
  actorRole!: 'CANDIDATE' | 'ASSISTANT' | 'ADMIN' | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  candidateId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  assignmentId!: string | null;

  @ApiProperty({ example: 'application.submitted' })
  action!: string;

  @ApiProperty({ example: 'APPLICATION' })
  resourceType!: string;

  @ApiProperty({ nullable: true })
  resourceId!: string | null;

  @ApiProperty({ nullable: true })
  requestId!: string | null;

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'Structured metadata. Sensitive keys (password, token, résumé content, …) ' +
      'are redacted at write time.',
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
