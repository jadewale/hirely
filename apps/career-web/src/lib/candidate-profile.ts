import { apiFetch, ApiError } from './api-client';
import type { CandidateProfile, CandidateProfileInput } from './contracts';

/**
 * Candidate-profile API access (Model layer). Talks to the RR-008 endpoints
 * `GET`/`PUT /api/candidate/profile`, which act on the SESSION user's own
 * profile — the browser never sends a userId. Business rules (ownership,
 * completion %) stay server-side; this module only reads/writes.
 */

/** Fetch the current candidate's profile, or `null` if not created yet (404). */
export async function getCandidateProfile(): Promise<CandidateProfile | null> {
  try {
    return await apiFetch<CandidateProfile>('/api/candidate/profile');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Create or update the current candidate's profile; returns the saved row. */
export async function saveCandidateProfile(
  input: CandidateProfileInput,
): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>('/api/candidate/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/** One field-level error surfaced by the API's Zod validation pipe. */
export type FieldErrors = Record<string, string>;

/**
 * Pull field → message pairs out of an {@link ApiError} body. The API's
 * `ZodValidationPipe` returns `{ code: 'VALIDATION_ERROR', validation: [{ path,
 * message }] }`; `path` may be a string or an array. Returns `null` when the
 * body isn't a validation error we recognise.
 */
export function extractFieldErrors(body: unknown): FieldErrors | null {
  if (
    !body ||
    typeof body !== 'object' ||
    !('validation' in body) ||
    !Array.isArray((body as { validation: unknown }).validation)
  ) {
    return null;
  }
  const errors: FieldErrors = {};
  for (const issue of (body as { validation: unknown[] }).validation) {
    if (!issue || typeof issue !== 'object') continue;
    const { path, message } = issue as { path?: unknown; message?: unknown };
    const key = Array.isArray(path) ? path.join('.') : String(path ?? '');
    if (key && typeof message === 'string' && !errors[key]) {
      errors[key] = message;
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
}
