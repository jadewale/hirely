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
        // TODO: kick off the Gmail OAuth scope-request here. For now we
        // advance straight to the scanning screen so designers can click
        // through the rest of the flow.
        onAuthorize={() => vm.actions.advanceTo("scanning")}
        onSkip={vm.actions.goToDashboard}
        onSwitchAccount={vm.actions.goToLogin}
      />
    );
  }

  if (vm.effectiveStep === "scanning") {
    return <Scanning />;
  }

  return (
    <FirstReveal
      onEnterApp={vm.actions.goToDashboard}
      onTakeTour={vm.actions.goToTour}
    />
  );
}
