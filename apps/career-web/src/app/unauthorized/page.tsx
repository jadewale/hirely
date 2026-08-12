import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Not authorized</h1>
      <p className="text-sm text-neutral-500">
        You do not have access to that page.
      </p>
      <Link href="/dashboard" className="text-sm underline">
        Go to your dashboard
      </Link>
    </main>
  );
}
