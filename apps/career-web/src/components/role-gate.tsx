'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { homeForRole, type Role } from '@/lib/roles';
import { useAuthUser } from '@/lib/use-auth';

/**
 * Client-side role guard for a page. Sends unauthenticated users to /sign-in and
 * users with the wrong role to their own dashboard (or /unauthorized). Renders a
 * loader until the session resolves and the role matches. Note: this is a UX
 * guard — the authoritative check is the API's RolesGuard (RR-006).
 */
export function RoleGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const { role: current, isPending, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (isPending) return;
    if (!isAuthenticated) {
      router.replace('/sign-in');
      return;
    }
    if (current !== role) {
      router.replace(current ? homeForRole(current) : '/unauthorized');
    }
  }, [isPending, isAuthenticated, current, role, router]);

  if (isPending || !isAuthenticated || current !== role) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }
  return <>{children}</>;
}
