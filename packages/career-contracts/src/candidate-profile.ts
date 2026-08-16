import { z } from 'zod';

export const remotePreferenceSchema = z.enum([
  'REMOTE',
  'HYBRID',
  'ONSITE',
  'ANY',
]);
export type RemotePreference = z.infer<typeof remotePreferenceSchema>;

/**
 * Input for creating/updating the candidate's OWN profile. Every field is
 * optional so the profile is completed progressively. Unknown keys (e.g. an
 * attempt to set userId/role) are stripped, and there is no field to change
 * ownership — the owner is always the session user, set server-side.
 */
export const candidateProfileInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(40),
    location: z.string().trim().max(200),
    headline: z.string().trim().max(200),
    preferredJobTitles: z.array(z.string().trim().min(1).max(120)).max(20),
    preferredLocations: z.array(z.string().trim().min(1).max(120)).max(20),
    remotePreference: remotePreferenceSchema,
    // Minor units (e.g. cents). Currency carried separately.
    minSalaryMinor: z.number().int().min(0).max(1_000_000_000),
    salaryCurrency: z.string().trim().length(3),
    workAuthorizationCountries: z.array(z.string().trim().length(2)).max(50),
    sponsorshipRequired: z.boolean(),
  })
  .partial();
export type CandidateProfileInput = z.infer<typeof candidateProfileInputSchema>;

/** Candidate profile as returned by the API. */
export const candidateProfileSchema = z.object({
  id: z.uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  preferredJobTitles: z.array(z.string()),
  preferredLocations: z.array(z.string()),
  remotePreference: remotePreferenceSchema.nullable(),
  minSalaryMinor: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  workAuthorizationCountries: z.array(z.string()),
  sponsorshipRequired: z.boolean().nullable(),
  profileCompletionPercentage: z.number().int().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
