import { z } from 'zod';

/**
 * Résumé upload contracts (RR-018).
 *
 * The browser never uploads file bytes to the API. Instead it asks the API for
 * a short-lived pre-signed S3 URL, PUTs the file straight to S3, then confirms.
 * The API only ever handles metadata; file contents never touch Postgres or the
 * API process.
 */

/** Résumé file types we accept. Keep in lockstep with the client file picker. */
export const resumeContentTypeSchema = z.enum([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);
export type ResumeContentType = z.infer<typeof resumeContentTypeSchema>;

/** Max résumé size accepted (bytes). Enforced client-side, in Zod, and by S3. */
export const RESUME_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const resumeStatusSchema = z.enum(['PENDING', 'READY']);
export type ResumeStatus = z.infer<typeof resumeStatusSchema>;

/** Body of `POST /api/candidate/resumes` — request a pre-signed upload URL. */
export const createResumeInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: resumeContentTypeSchema,
  sizeBytes: z.number().int().min(1).max(RESUME_MAX_BYTES),
});
export type CreateResumeInput = z.infer<typeof createResumeInputSchema>;

/** Résumé metadata as returned by the API. The S3 key is never exposed. */
export const resumeSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  status: resumeStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Resume = z.infer<typeof resumeSchema>;

/**
 * A one-time instruction for the browser to upload the file directly to S3.
 * `headers` MUST be sent verbatim on the PUT (they are part of what the URL
 * signature covers — omitting/altering them makes S3 reject the request).
 */
export const uploadTicketSchema = z.object({
  url: z.url(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
  expiresInSeconds: z.number().int().positive(),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/** Response to `POST /api/candidate/resumes`: the PENDING row + the upload ticket. */
export const createResumeResponseSchema = z.object({
  resume: resumeSchema,
  upload: uploadTicketSchema,
});
export type CreateResumeResponse = z.infer<typeof createResumeResponseSchema>;

/** Response to the download endpoint: a short-lived pre-signed GET URL. */
export const resumeDownloadSchema = z.object({
  url: z.url(),
  expiresInSeconds: z.number().int().positive(),
});
export type ResumeDownload = z.infer<typeof resumeDownloadSchema>;

/** Response to `GET /api/candidate/resumes`. */
export const resumeListSchema = z.object({
  resumes: z.array(resumeSchema),
});
export type ResumeList = z.infer<typeof resumeListSchema>;
