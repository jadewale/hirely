import type { Role } from '@career/contracts';

export type { Role };

const ROLES: readonly string[] = ['CANDIDATE', 'ASSISTANT', 'ADMIN'];

/** Narrow an unknown (e.g. a session field) to a Role, or null. */
export function toRole(value: unknown): Role | null {
  return typeof value === 'string' && ROLES.includes(value)
    ? (value as Role)
    : null;
}

/** The dashboard home path for a role. */
export function homeForRole(role: Role | null): string {
  switch (role) {
    case 'ASSISTANT':
      return '/assistant';
    case 'ADMIN':
      return '/admin';
    case 'CANDIDATE':
      return '/candidate';
    default:
      return '/sign-in';
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  CANDIDATE: 'Candidate',
  ASSISTANT: 'Assistant',
  ADMIN: 'Admin',
};
