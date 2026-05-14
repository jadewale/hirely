/**
 * Public env vars for `apps/web`.
 *
 * Anything prefixed with `NEXT_PUBLIC_` is inlined into the client bundle by
 * Next, so this module is safe to import from both server and client code.
 * Centralizing reads (instead of sprinkling `process.env.NEXT_PUBLIC_*`
 * everywhere) gives us one place to add validation, defaults, and types.
 */

/**
 * Base URL of the Hirely API.
 *
 * Better Auth's React client appends `/api/auth/...` itself, so this value
 * should be the host only (no `/api` suffix). The trailing slash is stripped
 * to keep concatenation predictable for ad-hoc `fetch` calls.
 */
export const API_URL: string = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");
