'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Shared credentials form for sign-in and sign-up. On success it routes to
 * `/dashboard`, which forwards to the role-specific home. All auth work is done
 * by the Better Auth client against career-api — no business logic here.
 */
export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result =
      mode === 'sign-up'
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? 'Something went wrong. Please try again.');
      return;
    }
    router.push('/dashboard');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === 'sign-up' && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Email</span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Password</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading
          ? 'Please wait…'
          : mode === 'sign-up'
            ? 'Create account'
            : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-neutral-500">
        {mode === 'sign-up' ? (
          <>
            Already have an account?{' '}
            <Link href="/sign-in" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            No account yet?{' '}
            <Link href="/sign-up" className="underline">
              Sign up
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
