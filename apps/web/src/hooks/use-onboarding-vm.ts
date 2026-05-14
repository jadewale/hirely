"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { useAuthMutations } from "@/hooks/use-auth-mutations";

export type OnboardingStep = "sign-in" | "connect" | "scanning" | "reveal";
export type AuthMode = "sign-in" | "sign-up";

interface State {
  step: OnboardingStep;
  mode: AuthMode;
}

type Action =
  | { type: "advance"; to: OnboardingStep }
  | { type: "toggle-mode" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "advance":
      return { ...s, step: a.to };
    case "toggle-mode":
      return { ...s, mode: s.mode === "sign-in" ? "sign-up" : "sign-in" };
    default: {
      const exhaustive: never = a;
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
 */
export function useOnboardingVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [{ step, mode }, dispatch] = React.useReducer(reducer, {
    step: "sign-in",
    mode: "sign-up",
  });

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
      toggleMode: () => dispatch({ type: "toggle-mode" }),
      advanceTo: (to: OnboardingStep) => dispatch({ type: "advance", to }),
      goToDashboard: () => router.push("/dashboard"),
      goToTour: () => router.push("/dashboard?tour=1"),
      goToLogin: () => router.push("/login"),
      signInWithGoogle: () => auth.signInGoogle.mutate(),
      signInWithEmail: (vars: { email: string; password: string }) =>
        auth.signInEmail.mutate(vars),
      signUpWithEmail: (vars: {
        email: string;
        password: string;
        name: string;
      }) => auth.signUpEmail.mutate(vars),
    }),
    [router, auth],
  );

  return {
    effectiveStep,
    mode,
    session,
    isPending: auth.isPending,
    errorMessage: auth.errorMessage,
    actions,
  };
}

export type OnboardingVm = ReturnType<typeof useOnboardingVm>;
