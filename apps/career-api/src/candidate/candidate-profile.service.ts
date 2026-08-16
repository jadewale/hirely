import { Inject, Injectable } from '@nestjs/common';
import type { CandidateProfileInput } from '@career/contracts';
import { eq, schema, type Database } from '@career/db';
import { DATABASE } from '../db/database.token';
import type { CandidateProfileResponseDto } from './dto/candidate-profile-response.dto';

type ProfileRow = typeof schema.candidateProfile.$inferSelect;
type ProfileFields = Omit<
  ProfileRow,
  'id' | 'createdAt' | 'updatedAt' | 'profileCompletionPercentage'
>;

// Fields that count toward completion; all weighted equally.
const COMPLETION_CHECKS: ReadonlyArray<(f: ProfileFields) => boolean> = [
  (f) => !!f.firstName,
  (f) => !!f.lastName,
  (f) => !!f.phone,
  (f) => !!f.location,
  (f) => !!f.headline,
  (f) => f.preferredJobTitles.length > 0,
  (f) => f.preferredLocations.length > 0,
  (f) => !!f.remotePreference,
  (f) => f.minSalaryMinor != null && !!f.salaryCurrency,
  (f) => f.workAuthorizationCountries.length > 0,
  (f) => f.sponsorshipRequired != null,
];

@Injectable()
export class CandidateProfileService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  computeCompletion(fields: ProfileFields): number {
    const done = COMPLETION_CHECKS.filter((check) => check(fields)).length;
    return Math.round((done / COMPLETION_CHECKS.length) * 100);
  }

  async getMine(userId: string): Promise<CandidateProfileResponseDto | null> {
    const row = await this.findByUserId(userId);
    return row ? this.toResponse(row) : null;
  }

  /** Create or update the caller's OWN profile. Owner is always `userId`. */
  async upsertMine(
    userId: string,
    input: CandidateProfileInput,
  ): Promise<CandidateProfileResponseDto> {
    const existing = await this.findByUserId(userId);
    const fields = this.merge(userId, existing, input);
    const profileCompletionPercentage = this.computeCompletion(fields);
    const now = new Date();

    const [row] = await this.db
      .insert(schema.candidateProfile)
      .values({ ...fields, profileCompletionPercentage })
      .onConflictDoUpdate({
        target: schema.candidateProfile.userId,
        set: {
          firstName: fields.firstName,
          lastName: fields.lastName,
          phone: fields.phone,
          location: fields.location,
          headline: fields.headline,
          preferredJobTitles: fields.preferredJobTitles,
          preferredLocations: fields.preferredLocations,
          remotePreference: fields.remotePreference,
          minSalaryMinor: fields.minSalaryMinor,
          salaryCurrency: fields.salaryCurrency,
          workAuthorizationCountries: fields.workAuthorizationCountries,
          sponsorshipRequired: fields.sponsorshipRequired,
          profileCompletionPercentage,
          updatedAt: now,
        },
      })
      .returning();
    // TODO(RR-015): record a sensitive-change audit entry once the audit
    // service exists — RR-008 acceptance calls for it, but audit is RR-015.
    return this.toResponse(row);
  }

  private async findByUserId(userId: string): Promise<ProfileRow | null> {
    const rows = await this.db
      .select()
      .from(schema.candidateProfile)
      .where(eq(schema.candidateProfile.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Merge input over the existing row (input wins; `false`/`0` are preserved). */
  private merge(
    userId: string,
    existing: ProfileRow | null,
    input: CandidateProfileInput,
  ): ProfileFields {
    return {
      userId,
      firstName: input.firstName ?? existing?.firstName ?? null,
      lastName: input.lastName ?? existing?.lastName ?? null,
      phone: input.phone ?? existing?.phone ?? null,
      location: input.location ?? existing?.location ?? null,
      headline: input.headline ?? existing?.headline ?? null,
      preferredJobTitles:
        input.preferredJobTitles ?? existing?.preferredJobTitles ?? [],
      preferredLocations:
        input.preferredLocations ?? existing?.preferredLocations ?? [],
      remotePreference:
        input.remotePreference ?? existing?.remotePreference ?? null,
      minSalaryMinor: input.minSalaryMinor ?? existing?.minSalaryMinor ?? null,
      salaryCurrency: input.salaryCurrency ?? existing?.salaryCurrency ?? null,
      workAuthorizationCountries:
        input.workAuthorizationCountries ??
        existing?.workAuthorizationCountries ??
        [],
      sponsorshipRequired:
        input.sponsorshipRequired ?? existing?.sponsorshipRequired ?? null,
    };
  }

  private toResponse(row: ProfileRow): CandidateProfileResponseDto {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      location: row.location,
      headline: row.headline,
      preferredJobTitles: row.preferredJobTitles,
      preferredLocations: row.preferredLocations,
      remotePreference: row.remotePreference,
      minSalaryMinor: row.minSalaryMinor,
      salaryCurrency: row.salaryCurrency,
      workAuthorizationCountries: row.workAuthorizationCountries,
      sponsorshipRequired: row.sponsorshipRequired,
      profileCompletionPercentage: row.profileCompletionPercentage,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
