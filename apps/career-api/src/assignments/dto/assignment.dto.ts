import { ApiProperty } from '@nestjs/swagger';

const PERMISSIONS = [
  'candidate.profile.read',
  'candidate.documents.read',
  'application.create',
  'application.read',
  'application.update',
  'application.submit_for_approval',
];

/**
 * Swagger shapes for the assignment endpoints. Validation is done by the Zod
 * `createAssignmentInputSchema` / `assignmentQuerySchema`; these only document
 * the API.
 */
export class CreateAssignmentInputDto {
  @ApiProperty() candidateUserId!: string;
  @ApiProperty() assistantUserId!: string;
  @ApiProperty({ isArray: true, enum: PERMISSIONS })
  permissions!: string[];
}

export class AssignmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() candidateUserId!: string;
  @ApiProperty() assistantUserId!: string;
  @ApiProperty({ isArray: true, enum: PERMISSIONS })
  permissions!: string[];
  @ApiProperty({ enum: ['ACTIVE', 'REVOKED'] }) status!: string;
  @ApiProperty({ nullable: true }) createdByUserId!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ nullable: true }) revokedAt!: string | null;
}

export class AssignmentListMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class AssignmentListDto {
  @ApiProperty({ type: [AssignmentDto] }) assignments!: AssignmentDto[];
  @ApiProperty({ type: AssignmentListMetaDto }) meta!: AssignmentListMetaDto;
}
