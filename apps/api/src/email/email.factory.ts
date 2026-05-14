/**
 * Plain (non-Nest) factory for EmailProvider. Used by:
 *   - `EmailModule` to register the Nest provider
 *   - `src/lib/auth.ts` to construct an EmailProvider outside the DI
 *     container (Better Auth's instance is built at module-load time,
 *     before DI exists)
 */
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
