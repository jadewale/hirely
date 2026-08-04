/**
 * Public env vars for `apps/career-web`.
 *
 * Anything prefixed with `NEXT_PUBLIC_` is inlined into the client bundle by
 * Next, so this module is safe to import from both server and client code.
 * Centralizing reads here gives us one place to add validation and types.
 */

/**
 * Base URL of the career-platform API (host only, no `/api` suffix). The
 * trailing slash is stripped to keep concatenation predictable.
 */
export const API_URL: string = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100"
).replace(/\/+$/, "");
