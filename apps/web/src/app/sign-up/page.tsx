"use client";

import { SignIn } from "@/components/onboarding/sign-in";
import { useSignUpVm } from "@/hooks/use-sign-up-vm";

/**
 * Stand-alone sign-up route (View).
 *
 * Once the account is created the user is sent to `/onboarding` which
 * walks them through Gmail connect, scan, and first reveal.
 */
export default function SignUpPage() {
  const vm = useSignUpVm();

  return (
    <SignIn
      mode="sign-up"
      isPending={vm.isPending}
      errorMessage={vm.errorMessage}
      onGoogleSignIn={vm.actions.signInWithGoogle}
      onEmailSubmit={({ email, password, name }) =>
        vm.actions.signUpWithEmail({ email, password, name })
      }
      onSwitchMode={vm.actions.goToLogin}
    />
  );
}
