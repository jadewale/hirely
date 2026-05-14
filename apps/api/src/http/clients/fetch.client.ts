import { Injectable } from '@nestjs/common';
import type { HttpClient, HttpRequestInit, HttpResponse } from '../http-client';

@Injectable()
export class FetchHttpClient implements HttpClient {
  async request<T = unknown>(
    url: string,
    init: HttpRequestInit = {},
  ): Promise<HttpResponse<T>> {
    const finalUrl = buildUrl(url, init.searchParams);
    const headers: Record<string, string> = { ...(init.headers ?? {}) };

    let body: BodyInit | undefined;
    if (init.body !== undefined && init.body !== null) {
      if (typeof init.body === 'string') {
        body = init.body;
      } else {
        body = JSON.stringify(init.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    const controller =
      init.timeoutMs !== undefined ? new AbortController() : undefined;
    const timer = controller
      ? setTimeout(() => controller.abort(), init.timeoutMs)
      : undefined;

    try {
      const res = await fetch(finalUrl, {
        method: init.method ?? 'GET',
        headers,
        body,
        signal: controller?.signal,
      });

      const rawText = await res.text();
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      const contentType = responseHeaders['content-type'] ?? '';
      let data: T | null = null;
      if (rawText && contentType.toLowerCase().includes('application/json')) {
        data = JSON.parse(rawText) as T;
      }

      return {
        status: res.status,
        ok: res.ok,
        headers: responseHeaders,
        data,
        rawText,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

function buildUrl(
  url: string,
  searchParams?: Record<string, string | number | boolean | undefined>,
): string {
  if (!searchParams) return url;
  const u = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}
