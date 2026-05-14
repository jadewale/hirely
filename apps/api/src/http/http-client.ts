export const HTTP_CLIENT = Symbol('HTTP_CLIENT');

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestInit {
  method?: HttpMethod;
  headers?: Record<string, string>;
  /** Plain object will be JSON-stringified; string / Buffer passed through. */
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** Per-request timeout in ms. Implementations should honor it. */
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  /** Parsed JSON body when `Content-Type` is application/json, otherwise null. */
  data: T | null;
  /** Raw response text. Useful for error bodies and non-JSON responses. */
  rawText: string;
}

export interface HttpClient {
  request<T = unknown>(
    url: string,
    init?: HttpRequestInit,
  ): Promise<HttpResponse<T>>;
}
