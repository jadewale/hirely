import { ApiProperty } from '@nestjs/swagger';

export class CandidateProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  location!: string | null;

  @ApiProperty({ nullable: true })
  headline!: string | null;

  @ApiProperty({ type: [String] })
  preferredJobTitles!: string[];

  @ApiProperty({ type: [String] })
  preferredLocations!: string[];

  @ApiProperty({
    enum: ['REMOTE', 'HYBRID', 'ONSITE', 'ANY'],
    nullable: true,
  })
  remotePreference!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Minimum salary in minor units (e.g. cents)',
  })
  minSalaryMinor!: number | null;

  @ApiProperty({ nullable: true, description: 'ISO 4217 currency code' })
  salaryCurrency!: string | null;

  @ApiProperty({ type: [String] })
  workAuthorizationCountries!: string[];

  @ApiProperty({ nullable: true })
  sponsorshipRequired!: boolean | null;

  @ApiProperty({ minimum: 0, maximum: 100 })
  profileCompletionPercentage!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
