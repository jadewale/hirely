"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import { useAuthMutations } from "@/hooks/use-auth-mutations";

/**
 * ViewModel for `/sign-up`.
 *
 * After a successful sign-up, the user continues into `/onboarding` which
 * walks them through Gmail connect, scan, and first reveal. A returning
 * user (already-resolved session) is redirected the same way -- they're
 * either mid-onboarding or done, and `/onboarding` knows how to deal with
 * both.
 */
export function useSignUpVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  React.useEffect(() => {
    if (!sessionPending && session) {
      router.replace("/onboarding");
    }
  }, [session, sessionPending, router]);

  const auth = useAuthMutations({
    onAuthenticated: () => router.replace("/onboarding"),
    googleCallbackPath: "/onboarding",
  });

  const actions = React.useMemo(
    () => ({
      signInWithGoogle: () => auth.signInGoogle.mutate(),
      signInWithLinkedIn: () =>
        toast.info("LinkedIn sign-in is coming soon — use Google for now."),
      signUpWithEmail: (vars: {
        email: string;
        password: string;
        name: string;
      }) => auth.signUpEmail.mutate(vars),
      goToLogin: () => router.push("/login"),
    }),
    [auth, router],
  );

  return {
    isPending: auth.isPending,
    errorMessage: auth.errorMessage,
    actions,
  };
}
