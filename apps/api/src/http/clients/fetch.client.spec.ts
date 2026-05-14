import { FetchHttpClient } from './fetch.client';

describe('FetchHttpClient', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockFetch = (impl: Partial<Response>) => {
    const res = {
      status: 200,
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(''),
      ...impl,
    } as Response;
    const fn = jest.fn(() => Promise.resolve(res));
    global.fetch = fn;
    return fn;
  };

  it('GETs a JSON response and parses data', async () => {
    mockFetch({
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{"hello":"world"}'),
    });
    const http = new FetchHttpClient();
    const res = await http.request<{ hello: string }>('https://x.test/y');
    expect(res.status).toBe(200);
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ hello: 'world' });
    expect(res.rawText).toBe('{"hello":"world"}');
  });

  it('serializes object body as JSON and adds Content-Type', async () => {
    const fn = mockFetch({
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve('{"id":"em_1"}'),
    });
    const http = new FetchHttpClient();
    await http.request('https://x.test/y', {
      method: 'POST',
      body: { a: 1 },
      headers: { Authorization: 'Bearer t' },
    });
    const init = fn.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBe('Bearer t');
  });

  it('passes string body untouched and does not set Content-Type', async () => {
    const fn = mockFetch({});
    const http = new FetchHttpClient();
    await http.request('https://x.test/y', { method: 'POST', body: 'raw' });
    const init = fn.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('raw');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('returns data: null for non-JSON responses', async () => {
    mockFetch({
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('plain text'),
    });
    const http = new FetchHttpClient();
    const res = await http.request('https://x.test/y');
    expect(res.data).toBeNull();
    expect(res.rawText).toBe('plain text');
  });

  it('appends searchParams to the URL', async () => {
    const fn = mockFetch({});
    const http = new FetchHttpClient();
    await http.request('https://x.test/y', {
      searchParams: { a: '1', b: 2, c: undefined },
    });
    const url = fn.mock.calls[0][0] as string;
    expect(url).toBe('https://x.test/y?a=1&b=2');
  });

  it('reports ok=false on non-2xx without throwing', async () => {
    mockFetch({
      status: 422,
      ok: false,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('bad input'),
    });
    const http = new FetchHttpClient();
    const res = await http.request('https://x.test/y');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(422);
    expect(res.rawText).toBe('bad input');
  });
});
