import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Swagger request-body shape for PUT /api/candidate/profile. Validation is done
 * by the Zod `candidateProfileInputSchema`; this class only documents the body.
 * All fields optional — the profile is completed progressively.
 */
export class CandidateProfileInputDto {
  @ApiPropertyOptional() firstName?: string;
  @ApiPropertyOptional() lastName?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() headline?: string;
  @ApiPropertyOptional({ type: [String] }) preferredJobTitles?: string[];
  @ApiPropertyOptional({ type: [String] }) preferredLocations?: string[];
  @ApiPropertyOptional({ enum: ['REMOTE', 'HYBRID', 'ONSITE', 'ANY'] })
  remotePreference?: string;
  @ApiPropertyOptional({ description: 'Minimum salary in minor units' })
  minSalaryMinor?: number;
  @ApiPropertyOptional({ description: 'ISO 4217 currency code' })
  salaryCurrency?: string;
  @ApiPropertyOptional({ type: [String] })
  workAuthorizationCountries?: string[];
  @ApiPropertyOptional() sponsorshipRequired?: boolean;
}
