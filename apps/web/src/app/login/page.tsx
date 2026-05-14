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
      mode="sign-in"
      isPending={vm.isPending}
      errorMessage={vm.errorMessage}
      onGoogleSignIn={vm.actions.signInWithGoogle}
      onEmailSubmit={({ email, password }) =>
        vm.actions.signInWithEmail({ email, password })
      }
      onSwitchMode={vm.actions.goToSignUp}
      onForgotPassword={vm.actions.goToForgotPassword}
    />
  );
}
