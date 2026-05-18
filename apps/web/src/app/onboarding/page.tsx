"use client";

import { FirstReveal } from "@/components/onboarding/first-reveal";
import { GmailConnect } from "@/components/onboarding/gmail-connect";
import { Scanning } from "@/components/onboarding/scanning";
import { SignIn } from "@/components/onboarding/sign-in";
import { useOnboardingVm } from "@/hooks/use-onboarding-vm";

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
