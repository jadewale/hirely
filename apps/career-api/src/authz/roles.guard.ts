import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@career/contracts';
import { InsufficientRoleException } from './authz.errors';
import { ROLES_KEY } from './roles.decorator';

interface RequestUser {
  role?: string | null;
}

/**
 * Method/controller guard enforcing @Roles/@RequireRoles. Runs AFTER the global
 * Better Auth AuthGuard, which authenticates the request and sets `request.user`
 * (including the `role` additional field). A route with no role metadata is
 * allowed through (authentication is still enforced by the global guard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: RequestUser | null }>();
    const user = request.user;
    // Defensive: the global AuthGuard should have rejected anonymous requests
    // already, so a missing user means the route isn't behind it.
    if (!user) throw new UnauthorizedException();

    const role = user.role ?? undefined;
    if (!role || !required.includes(role as Role)) {
      throw new InsufficientRoleException(required, role);
    }
    return true;
  }
}
