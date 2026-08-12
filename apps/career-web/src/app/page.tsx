'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthUser } from '@/lib/use-auth';

/** Entry point: send authenticated users to their dashboard, others to sign-in. */
export default function HomePage() {
  const router = useRouter();
  const { isPending, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (isPending) return;
    router.replace(isAuthenticated ? '/dashboard' : '/sign-in');
  }, [isPending, isAuthenticated, router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
      Loading…
    </main>
  );
}
