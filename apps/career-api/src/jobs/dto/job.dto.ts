import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const REMOTE = ['REMOTE', 'HYBRID', 'ONSITE'];
const EMPLOYMENT = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'TEMPORARY',
];

/**
 * Swagger shapes for the job endpoints. Validation is done by the Zod
 * `jobInputSchema` / `jobUpdateSchema` / `jobQuerySchema`; these classes only
 * document the API.
 */
export class JobInputDto {
  @ApiProperty() title!: string;
  @ApiProperty() company!: string;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional({ enum: REMOTE }) remoteType?: string;
  @ApiPropertyOptional({ enum: EMPLOYMENT }) employmentType?: string;
  @ApiPropertyOptional() seniority?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional({ description: 'Minor units' }) salaryMinMinor?: number;
  @ApiPropertyOptional({ description: 'Minor units' }) salaryMaxMinor?: number;
  @ApiPropertyOptional({ description: 'ISO 4217' }) salaryCurrency?: string;
  @ApiPropertyOptional() source?: string;
  @ApiPropertyOptional() url?: string;
}

export class JobUpdateDto extends JobInputDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'CLOSED'] }) status?: string;
}

export class JobDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() company!: string;
  @ApiProperty({ nullable: true }) location!: string | null;
  @ApiProperty({ nullable: true, enum: REMOTE }) remoteType!: string | null;
  @ApiProperty({ nullable: true, enum: EMPLOYMENT })
  employmentType!: string | null;
  @ApiProperty({ nullable: true }) seniority!: string | null;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ nullable: true }) salaryMinMinor!: number | null;
  @ApiProperty({ nullable: true }) salaryMaxMinor!: number | null;
  @ApiProperty({ nullable: true }) salaryCurrency!: string | null;
  @ApiProperty({ nullable: true }) source!: string | null;
  @ApiProperty({ nullable: true }) url!: string | null;
  @ApiProperty({ enum: ['OPEN', 'CLOSED'] }) status!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class JobListMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class JobListDto {
  @ApiProperty({ type: [JobDto] }) jobs!: JobDto[];
  @ApiProperty({ type: JobListMetaDto }) meta!: JobListMetaDto;
}
