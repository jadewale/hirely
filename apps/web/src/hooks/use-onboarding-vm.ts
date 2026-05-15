"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import { useAuthMutations } from "@/hooks/use-auth-mutations";

export type OnboardingStep = "sign-in" | "connect" | "scanning" | "reveal";

interface State {
  step: OnboardingStep;
}

type Action = { type: "advance"; to: OnboardingStep };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "advance":
      return { ...s, step: a.to };
    default: {
      const exhaustive: never = a.type;
      return exhaustive;
    }
  }
}

/**
 * ViewModel for the `/onboarding` orchestrator.
 *
 * Owns the step machine (via `useReducer`) and composes the session + auth
 * mutation hooks. The page component renders the right step based on
 * `effectiveStep` and forwards `actions` to the child components.
 *
 * `effectiveStep` is *derived* (not stored) so a session that arrives mid-
 * flow (cookie restore, Google round-trip) jumps the user straight to
 * "connect" without a `setState`-in-effect render loop.
 *
 * Sign-up has its own `/sign-up` route now, so this orchestrator only
 * handles sign-in for step 1.
 */
export function useOnboardingVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [{ step }, dispatch] = React.useReducer(reducer, { step: "sign-in" });

  const auth = useAuthMutations({ googleCallbackPath: "/onboarding" });

  const effectiveStep: OnboardingStep =
    !sessionPending && session && step === "sign-in" ? "connect" : step;

  // setState inside the *callback* of setTimeout doesn't run synchronously
  // in the effect body, so it doesn't trip react-hooks/set-state-in-effect.
  // Replace with a real scan-progress subscription when that ships.
  React.useEffect(() => {
    if (effectiveStep !== "scanning") return;
    const t = setTimeout(
      () => dispatch({ type: "advance", to: "reveal" }),
      3500,
    );
    return () => clearTimeout(t);
  }, [effectiveStep]);

  const actions = React.useMemo(
    () => ({
      advanceTo: (to: OnboardingStep) => dispatch({ type: "advance", to }),
      goToDashboard: () => router.push("/dashboard"),
      goToTour: () => router.push("/dashboard?tour=1"),
      goToLogin: () => router.push("/login"),
      goToSignUp: () => router.push("/sign-up"),
      signInWithGoogle: () => auth.signInGoogle.mutate(),
      signInWithLinkedIn: () =>
        toast.info("LinkedIn sign-in is coming soon — use Google for now."),
      signInWithEmail: (vars: {
        email: string;
        password: string;
        rememberMe?: boolean;
      }) => auth.signInEmail.mutate(vars),
    }),
    [router, auth],
  );

  return {
    effectiveStep,
    session,
    isPending: auth.isPending,
    errorMessage: auth.errorMessage,
    actions,
  };
}

export type OnboardingVm = ReturnType<typeof useOnboardingVm>;
