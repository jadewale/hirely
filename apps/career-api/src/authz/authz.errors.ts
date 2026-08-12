import { ForbiddenException } from '@nestjs/common';
import type { Role } from '@career/contracts';

/**
 * Thrown when the authenticated user's role isn't among those a route requires.
 * Typed (structured 403 body) so clients and tests can branch on `code`.
 */
export class InsufficientRoleException extends ForbiddenException {
  constructor(required: readonly Role[], actual: string | null | undefined) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      code: 'INSUFFICIENT_ROLE',
      message: `Requires role: ${required.join(' or ')}`,
      requiredRoles: required,
      actualRole: actual ?? null,
    });
  }
}
