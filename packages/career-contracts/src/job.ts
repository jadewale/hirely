import { z } from 'zod';
import { paginationMetaSchema } from './common';

/**
 * Job catalog contracts. Jobs are opportunities that admins/assistants add and
 * candidates browse; applications (later) target a job, and the résumé matcher
 * ranks jobs from this catalog. Salary is stored in integer minor units with a
 * separate ISO-4217 currency, like the rest of the platform.
 */

export const jobStatusSchema = z.enum(['OPEN', 'CLOSED']);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const jobRemoteTypeSchema = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);
export type JobRemoteType = z.infer<typeof jobRemoteTypeSchema>;

export const employmentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'TEMPORARY',
]);
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

/**
 * Create/update payload. `title` and `company` are required; everything else is
 * optional so a job can be captured quickly and enriched later. Update reuses
 * this via `.partial()`. A salary range must be ordered (min ≤ max).
 */
export const jobInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    location: z.string().trim().max(200).optional(),
    remoteType: jobRemoteTypeSchema.optional(),
    employmentType: employmentTypeSchema.optional(),
    seniority: z.string().trim().max(80).optional(),
    description: z.string().trim().max(20_000).optional(),
    salaryMinMinor: z.number().int().min(0).max(1_000_000_000).optional(),
    salaryMaxMinor: z.number().int().min(0).max(1_000_000_000).optional(),
    salaryCurrency: z.string().trim().length(3).optional(),
    source: z.string().trim().max(120).optional(),
    url: z.url().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.salaryMinMinor == null ||
      v.salaryMaxMinor == null ||
      v.salaryMinMinor <= v.salaryMaxMinor,
    { message: 'salaryMinMinor must be ≤ salaryMaxMinor', path: ['salaryMinMinor'] },
  );
export type JobInput = z.infer<typeof jobInputSchema>;

/** Update payload — any subset of the create fields. */
export const jobUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    location: z.string().trim().max(200),
    remoteType: jobRemoteTypeSchema,
    employmentType: employmentTypeSchema,
    seniority: z.string().trim().max(80),
    description: z.string().trim().max(20_000),
    salaryMinMinor: z.number().int().min(0).max(1_000_000_000),
    salaryMaxMinor: z.number().int().min(0).max(1_000_000_000),
    salaryCurrency: z.string().trim().length(3),
    source: z.string().trim().max(120),
    url: z.url().max(2000),
    status: jobStatusSchema,
  })
  .partial();
export type JobUpdate = z.infer<typeof jobUpdateSchema>;

/** A job as returned by the API. */
export const jobSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  remoteType: jobRemoteTypeSchema.nullable(),
  employmentType: employmentTypeSchema.nullable(),
  seniority: z.string().nullable(),
  description: z.string().nullable(),
  salaryMinMinor: z.number().int().nullable(),
  salaryMaxMinor: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  source: z.string().nullable(),
  url: z.string().nullable(),
  status: jobStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;

/** Query params for browsing/searching the catalog. */
export const jobQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  remoteType: jobRemoteTypeSchema.optional(),
  employmentType: employmentTypeSchema.optional(),
  status: jobStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type JobQuery = z.infer<typeof jobQuerySchema>;

/** A page of jobs plus pagination metadata. */
export const jobListSchema = z.object({
  jobs: z.array(jobSchema),
  meta: paginationMetaSchema,
});
export type JobList = z.infer<typeof jobListSchema>;
