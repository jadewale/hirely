'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { homeForRole, ROLE_LABELS, type Role } from '@/lib/roles';

/**
 * Top navigation for the authenticated shell. Role-aware: shows the role badge
 * and links to the role's dashboard home. Feature-specific nav sections are
 * added by later tickets.
 */
export function AppNav({ role, name }: { role: Role | null; name: string }) {
  const router = useRouter();

  async function onSignOut() {
    await authClient.signOut();
    router.replace('/sign-in');
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href={homeForRole(role)} className="font-semibold">
            Career Platform
          </Link>
          {role && (
            <Link
              href={homeForRole(role)}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Dashboard
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {role && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
              {ROLE_LABELS[role]}
            </span>
          )}
          <span className="text-neutral-500">{name}</span>
          <button
            onClick={onSignOut}
            className="rounded-md border border-neutral-300 px-3 py-1 transition hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
