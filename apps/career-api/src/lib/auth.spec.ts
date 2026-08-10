import { auth } from './auth';

describe('auth config', () => {
  it('is a Better Auth instance with a handler and api', () => {
    expect(auth).toBeDefined();
    expect(typeof auth.handler).toBe('function');
    expect(auth.api).toBeDefined();
  });

  it('enables email/password and trusts the frontend origin', () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.trustedOrigins).toContain('http://localhost:3100');
  });
});
