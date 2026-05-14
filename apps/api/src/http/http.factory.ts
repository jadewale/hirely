/**
 * Plain (non-Nest) factory for HttpClient. Used by:
 *   - `HttpModule` to register the Nest provider
 *   - `src/lib/auth.ts` to construct an HttpClient outside the DI container
 *     (Better Auth's instance is built at module-load time, before DI exists)
 */
import { AxiosHttpClient } from './clients/axios.client';
import { FetchHttpClient } from './clients/fetch.client';
import type { HttpClient } from './http-client';

export function createHttpClient(): HttpClient {
  const choice = (process.env.HTTP_CLIENT ?? 'fetch').toLowerCase();
  switch (choice) {
    case 'fetch':
      return new FetchHttpClient();
    case 'axios':
      return new AxiosHttpClient();
    default:
      throw new Error(
        `Unknown HTTP_CLIENT="${choice}". Expected one of: fetch, axios.`,
      );
  }
}
