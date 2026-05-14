"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { useAuthMutations } from "@/hooks/use-auth-mutations";

/**
 * ViewModel for `/login`.
 *
 * Returning users bounce straight to `/dashboard` on a successful sign-in
 * or once an existing session is detected. The "Create account" link in
 * the view jumps to `/sign-up` -- that's a navigation action exposed here
 * so the View stays presentational.
 *
 * The "already signed in" redirect is the one place we can't avoid an
 * effect: there's no React-render-friendly way to call `router.replace()`.
 * The setState-in-effect lint is happy with router calls because they're
 * external side effects, not React state writes.
 */
export function useLoginVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  React.useEffect(() => {
    if (!sessionPending && session) {
      router.replace("/dashboard");
    }
  }, [session, sessionPending, router]);

  const auth = useAuthMutations({
    onAuthenticated: () => router.replace("/dashboard"),
    googleCallbackPath: "/dashboard",
  });

  const actions = React.useMemo(
    () => ({
      signInWithGoogle: () => auth.signInGoogle.mutate(),
      signInWithEmail: (vars: { email: string; password: string }) =>
        auth.signInEmail.mutate(vars),
      goToSignUp: () => router.push("/sign-up"),
      goToForgotPassword: () => router.push("/login?forgot=1"),
    }),
    [auth, router],
  );

  return {
    isPending: auth.isPending,
    errorMessage: auth.errorMessage,
    actions,
  };
}
