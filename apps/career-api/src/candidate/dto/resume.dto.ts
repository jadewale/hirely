import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger shapes for the résumé endpoints. Request validation is done by the
 * Zod `createResumeInputSchema`; these classes only document the API.
 */
export class CreateResumeInputDto {
  @ApiProperty({ example: 'resume.pdf' }) fileName!: string;
  @ApiProperty({
    enum: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  })
  contentType!: string;
  @ApiProperty({ description: 'File size in bytes', example: 245678 })
  sizeBytes!: number;
}

export class ResumeDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() contentType!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ enum: ['PENDING', 'READY'] }) status!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class UploadTicketDto {
  @ApiProperty() url!: string;
  @ApiProperty({ enum: ['PUT'] }) method!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Headers to send verbatim on the PUT',
  })
  headers!: Record<string, string>;
  @ApiProperty() expiresInSeconds!: number;
}

export class CreateResumeResponseDto {
  @ApiProperty({ type: ResumeDto }) resume!: ResumeDto;
  @ApiProperty({ type: UploadTicketDto }) upload!: UploadTicketDto;
}

export class ResumeListDto {
  @ApiProperty({ type: [ResumeDto] }) resumes!: ResumeDto[];
}

export class ResumeDownloadDto {
  @ApiProperty() url!: string;
  @ApiProperty() expiresInSeconds!: number;
}
