import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { InsufficientRoleException } from './authz.errors';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let getAllAndOverride: jest.Mock;

  beforeEach(() => {
    getAllAndOverride = jest.fn();
    guard = new RolesGuard({ getAllAndOverride } as unknown as Reflector);
  });

  // Minimal ExecutionContext carrying a request.user.
  const ctx = (user: { role?: string | null } | null): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('allows any authenticated user when the route has no role requirement', () => {
    getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: 'CANDIDATE' }))).toBe(true);
  });

  it('allows a user whose role is required', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(guard.canActivate(ctx({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects a candidate from an admin route (403)', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx({ role: 'CANDIDATE' }))).toThrow(
      InsufficientRoleException,
    );
  });

  it('rejects an assistant from an admin route (403)', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx({ role: 'ASSISTANT' }))).toThrow(
      InsufficientRoleException,
    );
  });

  it('allows when the user holds one of several accepted roles', () => {
    getAllAndOverride.mockReturnValue(['ASSISTANT', 'ADMIN']);
    expect(guard.canActivate(ctx({ role: 'ASSISTANT' }))).toBe(true);
  });

  it('rejects a user with no role', () => {
    getAllAndOverride.mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(ctx({ role: null }))).toThrow(
      InsufficientRoleException,
    );
  });
});
