import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../lib/auth';

/** The authenticated user shape, including the `role` additional field. */
export type CurrentUserType = UserSession<typeof auth>['user'];

/**
 * Resolve the authenticated user from the request (set by the global AuthGuard).
 * Use only on routes that are behind auth — on an anonymous route it would be
 * null. Prefer this over reading `@Session()` when you only need the user.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserType => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: CurrentUserType }>();
    return request.user;
  },
);
