import { Injectable } from '@nestjs/common';
import type { HttpClient, HttpRequestInit, HttpResponse } from '../http-client';

/**
 * Axios implementation. Stub for now — axios isn't installed yet.
 *
 * To enable:
 *   1. `bun add axios` inside `apps/api/`
 *   2. Replace this body with an axios call that maps to HttpResponse<T>
 *   3. Set HTTP_CLIENT=axios in the environment
 *
 * Keeping the file means `HTTP_CLIENT=axios` doesn't 404 in the factory;
 * it throws a clear "not implemented" error at boot so it can't ship to
 * prod by accident.
 */
@Injectable()
export class AxiosHttpClient implements HttpClient {
  request<T = unknown>(
    _url: string,
    _init?: HttpRequestInit,
  ): Promise<HttpResponse<T>> {
    throw new Error(
      'AxiosHttpClient is a stub. `bun add axios` and implement before setting HTTP_CLIENT=axios.',
    );
  }
}
