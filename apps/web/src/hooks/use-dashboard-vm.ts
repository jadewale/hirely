"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient, useSession } from "@/lib/auth-client";

/**
 * ViewModel for `/dashboard`.
 *
 * Owns the session read, the sign-out mutation, and the bounce-to-login
 * redirect for unauthenticated visitors. The View only renders.
 */
export function useDashboardVm() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  React.useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  const signOut = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      toast.success("Signed out.");
      router.replace("/login");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const actions = React.useMemo(
    () => ({
      signOut: () => signOut.mutate(),
      restartOnboarding: () => router.push("/onboarding"),
    }),
    [signOut, router],
  );

  return {
    isLoading: isPending || !session,
    user: session?.user,
    isSigningOut: signOut.isPending,
    actions,
  };
}
