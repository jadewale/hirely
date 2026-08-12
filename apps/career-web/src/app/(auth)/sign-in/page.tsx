import { AuthForm } from '@/components/auth-form';

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-sm text-neutral-500">Welcome back to Career Platform.</p>
      </div>
      <AuthForm mode="sign-in" />
    </main>
  );
}
