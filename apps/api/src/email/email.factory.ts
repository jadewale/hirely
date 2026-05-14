/**
 * Plain (non-Nest) factory + singleton for EmailProvider.
 *
 * Two entry points:
 *   - `createEmailProvider(http)` — raw factory; useful in tests when you
 *     want to inject a mock HttpClient.
 *   - `getEmailProvider()` — memoized singleton used everywhere in prod
 *     code (`EmailModule`, `lib/auth.ts`, Inngest functions). Constructs
 *     its own HttpClient via `createHttpClient()`.
 *
 * Why a singleton? `auth.ts` builds Better Auth at module-load time
 * (before Nest DI exists) and Inngest functions also resolve at module
 * load. We don't want each of them constructing duplicate Resend/SES
 * clients; one shared instance keeps connection pools and config sets
 * consistent.
 */
import { createHttpClient } from '../http/http.factory';
import type { HttpClient } from '../http/http-client';
import type { EmailProvider } from './email.provider';
import { ConsoleEmailProvider } from './providers/console.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import { SesEmailProvider } from './providers/ses.provider';

export function createEmailProvider(http: HttpClient): EmailProvider {
  const choice = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
  switch (choice) {
    case 'resend':
      return new ResendEmailProvider(http);
    case 'ses':
      return new SesEmailProvider();
    case 'console':
      return new ConsoleEmailProvider();
    default:
      throw new Error(
        `Unknown EMAIL_PROVIDER="${choice}". Expected one of: resend, ses, console.`,
      );
  }
}

let cached: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (!cached) {
    cached = createEmailProvider(createHttpClient());
  }
  return cached;
}

// Test-only helper. Lets a Jest `afterEach` reset the singleton so the
// next test can pick up a different EMAIL_PROVIDER env var. Kept here
// (not in a `__test__` file) because Jest's module cache makes a separate
// reset module awkward.
export function __resetEmailProviderForTests(): void {
  cached = undefined;
}
