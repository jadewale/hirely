"use client";

import { SignIn } from "@/components/onboarding/sign-in";
import { useLoginVm } from "@/hooks/use-login-vm";

/**
 * Stand-alone sign-in route for returning users (View).
 *
 * The multi-step onboarding flow (Gmail connect, scan, first reveal) lives
 * at `/onboarding` and is meant for brand-new users only -- this page
 * exists so existing users can come back without re-running the wizard.
 */
export default function LoginPage() {
  const vm = useLoginVm();

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
      onForgotPassword={vm.actions.goToForgotPassword}
    />
  );
}
