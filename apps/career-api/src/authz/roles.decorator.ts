import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import type { Role } from '@career/contracts';
import { RolesGuard } from './roles.guard';

export const ROLES_KEY = 'career:roles';

/** Attach the required roles as route metadata (read by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Guard a route/controller so only the listed roles may access it — one
 * decorator that wires both the RolesGuard and the @Roles metadata.
 *
 *   @RequireRoles('ADMIN')
 *   @Get() adminOnly() { ... }
 */
export const RequireRoles = (...roles: Role[]) =>
  applyDecorators(Roles(...roles), UseGuards(RolesGuard));
