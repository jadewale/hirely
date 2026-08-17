/**
 * Defensive redaction for audit metadata (RR-015). Callers are expected to
 * pass structured, minimal metadata — this is a belt-and-suspenders filter for
 * cases where a raw object slips in with a known-sensitive key.
 *
 * Keys are compared after normalising to lowercase and stripping `_` and `-`,
 * so `password`, `Password`, `PASSWORD`, `api_key`, `API-KEY`, and `apiKey` all
 * match the same entry. Matching is on the FULL normalised key (not a
 * substring), so `resumeCount` is NOT redacted while `resumeUrl` is.
 */
const normalizeKey = (key: string): string =>
  key.toLowerCase().replace(/[_-]/g, '');

const SENSITIVE_KEYS = new Set(
  [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'idToken',
    'apiKey',
    'authorization',
    'auth',
    'cookie',
    'setCookie',
    'sessionToken',
    'ssn',
    'creditCard',
    'cardNumber',
    'cvv',
    'resume',
    'resumeUrl',
    'resumeContent',
    'résumé',
  ].map(normalizeKey),
);

const REDACTED = '[REDACTED]' as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

export function redactMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (metadata == null) return null;
  return redactValue(metadata) as Record<string, unknown>;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.has(normalizeKey(key))
        ? REDACTED
        : redactValue(val);
    }
    return out;
  }
  return value;
}
