import type { HttpClient, HttpResponse } from '../../http/http-client';
import { ResendEmailProvider } from './resend.provider';

const okResponse = <T>(data: T): HttpResponse<T> => ({
  status: 200,
  ok: true,
  headers: {},
  data,
  rawText: JSON.stringify(data),
});

const errResponse = (status: number, text: string): HttpResponse<never> => ({
  status,
  ok: false,
  headers: {},
  data: null,
  rawText: text,
});

const buildHttp = (
  impl: (url: string, init?: unknown) => Promise<HttpResponse<unknown>>,
): HttpClient => ({ request: impl as unknown as HttpClient['request'] });

describe('ResendEmailProvider', () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeAll(() => {
    process.env.RESEND_API_KEY = 'test_key_123';
  });
  afterAll(() => {
    process.env.RESEND_API_KEY = originalKey;
  });

  it('POSTs to Resend through the injected HttpClient', async () => {
    const requestMock = jest.fn(() =>
      Promise.resolve(okResponse({ id: 'em_42' })),
    );
    const http = buildHttp(requestMock);

    const p = new ResendEmailProvider(http);
    const result = await p.sendEmail({
      to: 'x@example.com',
      from: 'noreply@hirely.io',
      subject: 'hi',
      html: '<p>hi</p>',
    });

    expect(result.id).toBe('em_42');
    expect(requestMock).toHaveBeenCalledTimes(1);
    const [url, init] = requestMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const requestInit = init as {
      method: string;
      headers: Record<string, string>;
      body: { to: string; subject: string };
    };
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers.Authorization).toBe('Bearer test_key_123');
    expect(requestInit.body).toMatchObject({
      to: 'x@example.com',
      subject: 'hi',
    });
  });

  it('throws when Resend returns non-200', async () => {
    const http = buildHttp(
      jest.fn(() => Promise.resolve(errResponse(422, 'invalid_from'))),
    );
    const p = new ResendEmailProvider(http);
    await expect(
      p.sendEmail({
        to: 'x@example.com',
        from: 'bad@unverified.io',
        subject: 'x',
        html: 'x',
      }),
    ).rejects.toThrow(/Resend send failed: 422/);
  });

  it('boot fails if RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY;
    const http = buildHttp(jest.fn());
    expect(() => new ResendEmailProvider(http)).toThrow(/RESEND_API_KEY/);
    process.env.RESEND_API_KEY = 'test_key_123';
  });
});
