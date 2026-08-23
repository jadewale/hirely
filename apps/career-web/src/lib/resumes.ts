import { apiFetch } from './api-client';
import {
  RESUME_MAX_BYTES,
  resumeContentTypeSchema,
  type CreateResumeResponse,
  type Resume,
  type ResumeContentType,
  type ResumeDownload,
  type ResumeList,
} from './contracts';

/**
 * Résumé upload/list/delete (Model layer, RR-018). The API only mints signed
 * URLs and stores metadata — the file bytes go straight from the browser to S3
 * (never through our API). All endpoints act on the session user's own
 * résumés.
 */

export { RESUME_MAX_BYTES };

/** Human-friendly labels for the accepted file types. */
export const ACCEPTED_RESUME_TYPES = resumeContentTypeSchema.options;

/** `accept` attribute for the file picker. */
export const RESUME_ACCEPT = '.pdf,.doc,.docx';

export async function listResumes(): Promise<Resume[]> {
  const { resumes } = await apiFetch<ResumeList>('/api/candidate/resumes');
  return resumes;
}

export async function deleteResume(id: string): Promise<void> {
  await apiFetch<void>(`/api/candidate/resumes/${id}`, { method: 'DELETE' });
}

/** Fetch a fresh signed download URL and open it in a new tab. */
export async function openResumeDownload(id: string): Promise<void> {
  const { url } = await apiFetch<ResumeDownload>(
    `/api/candidate/resumes/${id}/download`,
  );
  window.open(url, '_blank', 'noopener');
}

/** Validate a picked file against the same rules the API enforces. */
export function validateResumeFile(file: File): string | null {
  if (!ACCEPTED_RESUME_TYPES.includes(file.type as ResumeContentType)) {
    return 'Please choose a PDF or Word document.';
  }
  if (file.size > RESUME_MAX_BYTES) {
    return `File is too large (max ${Math.floor(RESUME_MAX_BYTES / (1024 * 1024))} MB).`;
  }
  if (file.size === 0) {
    return 'That file is empty.';
  }
  return null;
}

/**
 * The full three-step upload: ask the API for a signed URL, PUT the file
 * straight to S3, then confirm so the API marks it READY. Returns the READY
 * résumé. The S3 PUT uses a bare fetch (no credentials, exact signed headers) —
 * apiFetch is only for our own API.
 */
export async function uploadResume(file: File): Promise<Resume> {
  const { resume, upload } = await apiFetch<CreateResumeResponse>(
    '/api/candidate/resumes',
    {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    },
  );

  const put = await fetch(upload.url, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload to storage failed (${put.status}).`);
  }

  return apiFetch<Resume>(`/api/candidate/resumes/${resume.id}/confirm`, {
    method: 'POST',
  });
}
