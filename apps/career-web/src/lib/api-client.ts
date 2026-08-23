import { API_URL } from './env';

/** Non-2xx response from the career-api. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Parsed JSON error body, when the API returned one (e.g. Zod validation). */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Thin credentialed fetch wrapper for the career-api. Sends the session cookie
 * (`credentials: 'include'`) and JSON-decodes the response. Feature ViewModels
 * build on this as the API surface grows; all business logic stays server-side.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new ApiError(
      res.status,
      `${init?.method ?? 'GET'} ${path} → ${res.status}`,
      body,
    );
  }
  return (await res.json()) as T;
}
