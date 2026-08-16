'use client';

import { authClient } from './auth-client';
import { toRole, type Role } from './roles';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role | null;
}

/**
 * Session-aware view of the current user for client components. Wraps Better
 * Auth's useSession and surfaces a typed `role` (from the server's additional
 * field). `isPending` covers the initial session load so callers can show a
 * spinner instead of flashing signed-out UI.
 */
export function useAuthUser(): {
  user: AuthUser | null;
  role: Role | null;
  isPending: boolean;
  isAuthenticated: boolean;
} {
  const { data, isPending } = authClient.useSession();
  const raw = data?.user ?? null;
  const user: AuthUser | null = raw
    ? {
        id: raw.id,
        email: raw.email,
        name: raw.name,
        role: toRole((raw as { role?: unknown }).role),
      }
    : null;
  return {
    user,
    role: user?.role ?? null,
    isPending,
    isAuthenticated: !!user,
  };
}
