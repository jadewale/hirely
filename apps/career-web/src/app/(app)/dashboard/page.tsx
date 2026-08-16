'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homeForRole } from '@/lib/roles';
import { useAuthUser } from '@/lib/use-auth';

/** Routes the signed-in user to their role-specific dashboard. */
export default function DashboardRedirect() {
  const router = useRouter();
  const { role, isPending, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (isPending) return;
    if (!isAuthenticated) {
      router.replace('/sign-in');
      return;
    }
    router.replace(homeForRole(role));
  }, [role, isPending, isAuthenticated, router]);

  return <p className="text-sm text-neutral-500">Redirecting…</p>;
}
