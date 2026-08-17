import { redactMetadata } from './redact';

describe('redactMetadata', () => {
  it('returns null for null/undefined input', () => {
    expect(redactMetadata(null)).toBeNull();
    expect(redactMetadata(undefined)).toBeNull();
  });

  it('redacts known-sensitive top-level keys, case-insensitively', () => {
    expect(
      redactMetadata({
        password: 'hunter2',
        Password: 'hunter2',
        API_KEY: 'sk_live_xxx',
        token: 'abc',
        authorization: 'Bearer xyz',
      }),
    ).toEqual({
      password: '[REDACTED]',
      Password: '[REDACTED]',
      API_KEY: '[REDACTED]',
      token: '[REDACTED]',
      authorization: '[REDACTED]',
    });
  });

  it('keeps unrelated keys with similar names', () => {
    // `resumeCount` is not in the sensitive set — full word match, not substring.
    const out = redactMetadata({ resumeCount: 3, resume: 'data' });
    expect(out).toEqual({ resumeCount: 3, resume: '[REDACTED]' });
  });

  it('recurses into nested objects and arrays', () => {
    const out = redactMetadata({
      before: { role: 'CANDIDATE', password: 'x' },
      after: { role: 'ASSISTANT' },
      history: [{ token: 't1' }, { note: 'ok' }],
    });
    expect(out).toEqual({
      before: { role: 'CANDIDATE', password: '[REDACTED]' },
      after: { role: 'ASSISTANT' },
      history: [{ token: '[REDACTED]' }, { note: 'ok' }],
    });
  });

  it('leaves non-object primitives untouched', () => {
    expect(redactMetadata({ count: 5, ok: true, tag: null })).toEqual({
      count: 5,
      ok: true,
      tag: null,
    });
  });
});
