"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthMutations } from "@/hooks/use-auth-mutations";
import { useGoogleConnect } from "@/hooks/use-google-connect";
import { useGoogleStatus } from "@/hooks/use-google-status";
import { useSession } from "@/lib/auth-client";

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
 * Owns the step machine (via `useReducer`) and composes the session +
 * auth mutation hooks. The page component renders the right step based
 * on `effectiveStep` and forwards `actions` to the child components.
 *
 * Step derivation rules:
 *   - No session                       → "sign-in"
 *   - Session, no Gmail scopes         → "connect"
 *   - Session + Gmail scopes granted   → "scanning" (auto-advances)
 *   - Explicitly advanced past scanning → "reveal"
 *
 * Inbox status is read from `/api/integrations/google/status` via
 * TanStack Query. The status query is invalidated by `useGoogleConnect`
 * on its way out, so when the user lands back from Google's OAuth
 * round-trip the refetched status flips inboxConnected to true and the
 * step derivation moves to "scanning" without any explicit dispatch.
 */
export function useOnboardingVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [{ step }, dispatch] = React.useReducer(reducer, { step: "sign-in" });

  const auth = useAuthMutations({ googleCallbackPath: "/onboarding" });
  const googleConnect = useGoogleConnect({ callbackPath: "/onboarding" });
  const googleStatus = useGoogleStatus({
    enabled: !sessionPending && !!session,
  });

  const inboxConnected = googleStatus.data?.inboxConnected ?? false;

  const effectiveStep: OnboardingStep = (() => {
    if (sessionPending) return step;
    if (!session) return "sign-in";
    if (step === "reveal") return "reveal";
    if (step === "scanning") return "scanning";
    return inboxConnected ? "scanning" : "connect";
  })();

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
      connectGoogle: () => googleConnect.mutate(),
    }),
    [router, auth, googleConnect],
  );

  return {
    effectiveStep,
    session,
    isPending: auth.isPending || googleConnect.isPending,
    errorMessage: auth.errorMessage,
    googleStatus: googleStatus.data,
    actions,
  };
}

export type OnboardingVm = ReturnType<typeof useOnboardingVm>;
