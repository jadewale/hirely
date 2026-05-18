"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthMutations } from "@/hooks/use-auth-mutations";
import { useGoogleConnect } from "@/hooks/use-google-connect";
import { useGoogleStatus } from "@/hooks/use-google-status";
import { useScanStatus } from "@/hooks/use-scan-status";
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

  // Real scan progress: poll the server while we're on the scanning
  // step, advance to "reveal" the moment status goes terminal.
  const scanStatus = useScanStatus({
    enabled: effectiveStep === "scanning",
  });

  React.useEffect(() => {
    if (effectiveStep !== "scanning") return;
    const status = scanStatus.data?.status;
    if (status === "completed" || status === "failed") {
      dispatch({ type: "advance", to: "reveal" });
    }
  }, [effectiveStep, scanStatus.data?.status]);

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
    scanStatus: scanStatus.data,
    actions,
  };
}

export type OnboardingVm = ReturnType<typeof useOnboardingVm>;
