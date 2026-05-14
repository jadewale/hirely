import { ResendEmailProvider } from './resend.provider';

describe('ResendEmailProvider', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;

  beforeAll(() => {
    process.env.RESEND_API_KEY = 'test_key_123';
  });
  afterAll(() => {
    process.env.RESEND_API_KEY = originalKey;
    global.fetch = originalFetch;
  });

  it('POSTs to Resend with auth header and JSON body', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'em_42' }),
      } as unknown as Response),
    );
    global.fetch = fetchMock;

    const p = new ResendEmailProvider();
    const result = await p.sendEmail({
      to: 'x@example.com',
      from: 'noreply@hirely.io',
      subject: 'hi',
      html: '<p>hi</p>',
    });

    expect(result.id).toBe('em_42');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test_key_123');
    expect(JSON.parse(init.body as string)).toMatchObject({
      to: 'x@example.com',
      subject: 'hi',
    });
  });

  it('throws when Resend returns non-200', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 422,
        text: () => Promise.resolve('invalid_from'),
      } as unknown as Response),
    );

    const p = new ResendEmailProvider();
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
    expect(() => new ResendEmailProvider()).toThrow(/RESEND_API_KEY/);
    process.env.RESEND_API_KEY = 'test_key_123';
  });
});
