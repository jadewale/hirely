import type { Database } from '@career/db';
import { CandidateProfileService } from './candidate-profile.service';

// Fields shape the completion calc reads (no id/timestamps/percentage).
const emptyFields = {
  userId: 'user-1',
  firstName: null,
  lastName: null,
  phone: null,
  location: null,
  headline: null,
  preferredJobTitles: [] as string[],
  preferredLocations: [] as string[],
  remotePreference: null as string | null,
  minSalaryMinor: null as number | null,
  salaryCurrency: null as string | null,
  workAuthorizationCountries: [] as string[],
  sponsorshipRequired: null as boolean | null,
};

describe('CandidateProfileService.computeCompletion', () => {
  // computeCompletion doesn't touch the DB, so a stub client is fine.
  const service = new CandidateProfileService({} as Database);

  it('is 0% for an empty profile', () => {
    expect(service.computeCompletion(emptyFields)).toBe(0);
  });

  it('is 100% when every section is filled', () => {
    expect(
      service.computeCompletion({
        ...emptyFields,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phone: '+1 555 0100',
        location: 'London',
        headline: 'Backend engineer',
        preferredJobTitles: ['Backend Engineer'],
        preferredLocations: ['Remote'],
        remotePreference: 'REMOTE',
        minSalaryMinor: 12_000_000,
        salaryCurrency: 'USD',
        workAuthorizationCountries: ['GB'],
        sponsorshipRequired: false,
      }),
    ).toBe(100);
  });

  it('counts sponsorshipRequired=false as completed (not empty)', () => {
    expect(
      service.computeCompletion({ ...emptyFields, sponsorshipRequired: false }),
    ).toBeGreaterThan(0);
  });

  it('needs both salary and currency for the salary section to count', () => {
    // salary without a currency does not complete the salary section
    expect(
      service.computeCompletion({ ...emptyFields, minSalaryMinor: 5000 }),
    ).toBe(0);
  });
});
