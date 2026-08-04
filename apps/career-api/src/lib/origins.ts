/**
 * Shared origin-list parser.
 *
 * `FRONTEND_URL` is a comma-separated list in prod (e.g.
 * `https://app.example.com,http://localhost:3100`) and a single value in dev.
 * Both CORS (in `bootstrap.ts`) and, once RR-005 lands, Better Auth's
 * `trustedOrigins` must see the same parsed list so a request that passes CORS
 * is not later rejected as an untrusted origin.
 */
export function parseOrigins(
  raw: string | undefined,
  fallback: string,
): string[] {
  const source = raw && raw !== 'unset' ? raw : fallback;
  const list = source
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.length > 0);
  return Array.from(new Set(list));
}
