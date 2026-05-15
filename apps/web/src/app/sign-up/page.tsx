"use client";

import { SignUp } from "@/components/onboarding/sign-up";
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
    <SignUp
      isPending={vm.isPending}
      errorMessage={vm.errorMessage}
      onGoogleSignIn={vm.actions.signInWithGoogle}
      onLinkedInSignIn={vm.actions.signInWithLinkedIn}
      onEmailSignUp={({ email, password, name }) =>
        vm.actions.signUpWithEmail({ email, password, name })
      }
      onSignIn={vm.actions.goToLogin}
    />
  );
}
