/**
 * Shared origin-list parser.
 *
 * `FRONTEND_URL` is a comma-separated list in prod (e.g.
 * `https://app.mindoutreach.com,http://localhost:3000`) and a single value
 * in dev. Both CORS (in `bootstrap.ts`) and Better Auth's `trustedOrigins`
 * (in `auth.ts`) must see the same parsed list — otherwise the browser
 * passes CORS but Better Auth still rejects the request with
 * "Invalid callbackURL" or "Invalid origin".
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
