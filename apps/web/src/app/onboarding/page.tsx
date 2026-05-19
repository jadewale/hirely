"use client";

import * as React from "react";
import { toast } from "sonner";

import { FirstReveal } from "@/components/onboarding/first-reveal";
import { GmailConnect } from "@/components/onboarding/gmail-connect";
import { Scanning } from "@/components/onboarding/scanning";
import { SignIn } from "@/components/onboarding/sign-in";
import { useOnboardingVm } from "@/hooks/use-onboarding-vm";

/**
 * Friendly copy for the error codes Better Auth surfaces when an OAuth
 * link/sign-in round-trip fails. The codes are stable identifiers from
 * Better Auth's error registry. We default to a generic retry message
 * so we never strand the user on a silent failure -- unknown codes
 * still get a recoverable nudge.
 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  "email_doesn't_match":
    "That Google account has a different email than your Hirely account. We've enabled mismatched-email linking — try Authorize again.",
  account_not_linked:
    "We couldn't link that Google account. Sign in with the email you used originally, then try connecting Google from settings.",
  access_denied:
    "You cancelled Google's consent screen. Tap Authorize to try again.",
  signup_disabled:
    "Sign-ups are paused right now. Reach out and we'll get you in.",
};

/**
 * Reads `?error=<code>` once on mount, fires a toast, and replaces the
 * URL to clear the param -- otherwise a hard refresh would re-trigger
 * the toast on every reload. Better Auth points failed OAuth round-trips
 * at this page via the `errorCallbackURL` we pass in `useGoogleConnect`.
 */
function useOAuthErrorToast(): void {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (!code) return;
    toast.error(
      OAUTH_ERROR_MESSAGES[code] ??
        "Something went wrong connecting Google. Please try again.",
    );
    params.delete("error");
    const next = params.toString();
    const url =
      window.location.pathname + (next ? `?${next}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", url);
  }, []);
}

/**
 * Onboarding orchestrator (View).
 *
 * A thin shell over `useOnboardingVm`. All data fetching, step-machine
 * logic, and routing decisions live in the ViewModel; this file just maps
 * the current step to the right child component and threads callbacks
 * through. See `.cursor/rules/web-vvm.mdc`.
 *
 * Step 1 (auth) is fully wired to Better Auth. Steps 2-4 are design-only
 * stubs for now -- the Gmail OAuth scope-request and the inbox-scan
 * subscription land in follow-up slices.
 */
export default function OnboardingPage() {
  useOAuthErrorToast();
  const vm = useOnboardingVm();

  if (vm.effectiveStep === "sign-in") {
    return (
      <SignIn
        isPending={vm.isPending}
        errorMessage={vm.errorMessage}
        onGoogleSignIn={vm.actions.signInWithGoogle}
        onLinkedInSignIn={vm.actions.signInWithLinkedIn}
        onEmailSignIn={({ email, password, remember }) =>
          vm.actions.signInWithEmail({
            email,
            password,
            rememberMe: remember,
          })
        }
        onCreateAccount={vm.actions.goToSignUp}
        onForgotPassword={vm.actions.goToLogin}
      />
    );
  }

  if (vm.effectiveStep === "connect") {
    return (
      <GmailConnect
        userEmail={vm.session?.user?.email}
        isPending={vm.isPending}
        // Real Google OAuth scope-upgrade flow: the browser is
        // redirected to Google's consent screen, then back to
        // /onboarding. The VM's googleStatus query refetches and the
        // step machine derives "scanning" from inboxConnected = true.
        onAuthorize={vm.actions.connectGoogle}
        onSkip={vm.actions.goToDashboard}
        onSwitchAccount={vm.actions.goToLogin}
      />
    );
  }

  if (vm.effectiveStep === "scanning") {
    // ETA: ~3s per batch (LLM-bound), bounded by concurrency=3. Rough
    // formula matches the API's actual behavior closely enough that
    // the countdown feels honest without us shipping a server-side
    // ETA endpoint.
    const scan = vm.scanStatus;
    const scanned = scan?.classifiedCount ?? 0;
    const total = scan?.discoveredTotal || scan?.targetTotal || 1;
    const batchesRemaining = (scan?.batchesTotal ?? 0) -
      (scan?.batchesCompleted ?? 0);
    const etaSeconds = Math.max(3, Math.ceil((batchesRemaining * 3) / 3));
    return (
      <Scanning
        scanned={scanned}
        total={total}
        etaSeconds={etaSeconds}
        status={scan?.status}
      />
    );
  }

  return (
    <FirstReveal
      onEnterApp={vm.actions.goToDashboard}
      onTakeTour={vm.actions.goToTour}
    />
  );
}
