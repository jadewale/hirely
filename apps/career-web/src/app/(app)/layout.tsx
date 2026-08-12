'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppNav } from '@/components/app-nav';
import { useAuthUser } from '@/lib/use-auth';

/**
 * Authenticated shell. Redirects unauthenticated users to /sign-in and shows a
 * loader while the session resolves (no flash of signed-out content). Renders
 * the role-aware nav around every page in this group.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, role, isPending, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (!isPending && !isAuthenticated) router.replace('/sign-in');
  }, [isPending, isAuthenticated, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return null; // redirecting to /sign-in

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav role={role} name={user?.name ?? ''} />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
