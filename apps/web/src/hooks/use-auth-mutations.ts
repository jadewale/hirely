"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/env";

/**
 * Shape returned by every Better Auth client method.
 *
 * We only care about `error`; the React client also updates its internal
 * session cache on success, so we don't need the `data` shape here.
 */
interface BetterAuthError {
  message?: string;
  status?: number;
  code?: string;
}

interface BetterAuthResult {
  error?: BetterAuthError | null;
}

function unwrap(result: BetterAuthResult, fallback: string): void {
  if (result.error) {
    throw new Error(result.error.message ?? fallback);
  }
}

/**
 * Build the URL Better Auth should bounce the browser back to after a Google
 * OAuth round-trip. `window` is only defined on the client, so we guard the
 * read for SSR safety.
 */
function callbackUrl(path: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${path}`;
}

export interface UseAuthMutationsOptions {
  /** Called once a sign-in or sign-up returns successfully. */
  onAuthenticated?: () => void;
  /**
   * Path the browser should land on after Google OAuth completes (relative
   * to the web origin). Defaults to `/dashboard`.
   */
  googleCallbackPath?: string;
}

export function useAuthMutations(opts: UseAuthMutationsOptions = {}) {
  const { onAuthenticated, googleCallbackPath = "/dashboard" } = opts;

  const signInEmail = useMutation({
    mutationFn: async (vars: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => {
      const result = (await authClient.signIn.email({
        email: vars.email,
        password: vars.password,
        // Better Auth uses this to extend the session cookie's max-age past
        // the default session window. Defaults to false on the server.
        rememberMe: vars.rememberMe ?? false,
      })) as BetterAuthResult;
      unwrap(result, "Sign in failed. Please try again.");
    },
    onSuccess: () => onAuthenticated?.(),
    onError: (err: Error) => toast.error(err.message),
  });

  const signUpEmail = useMutation({
    mutationFn: async (vars: {
      email: string;
      password: string;
      name: string;
    }) => {
      const name = vars.name.trim() || vars.email.split("@")[0] || "there";
      const result = (await authClient.signUp.email({
        email: vars.email,
        password: vars.password,
        name,
      })) as BetterAuthResult;
      unwrap(result, "Sign up failed. Please try again.");
    },
    onSuccess: () => onAuthenticated?.(),
    onError: (err: Error) => toast.error(err.message),
  });

  const signInGoogle = useMutation({
    mutationFn: async () => {
      const result = (await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl(googleCallbackPath),
      })) as BetterAuthResult;
      // signIn.social typically redirects the browser. If it returns
      // (e.g. provider unconfigured), surface that as an error.
      unwrap(result, "Could not start Google sign-in. Please try again.");
    },
    onError: (err: Error) => {
      const hint =
        err.message ||
        `Could not reach ${API_URL}. Is the API running on that origin?`;
      toast.error(hint);
    },
  });

  const isPending =
    signInEmail.isPending || signUpEmail.isPending || signInGoogle.isPending;

  const errorMessage = React.useMemo(() => {
    if (signInEmail.error) return signInEmail.error.message;
    if (signUpEmail.error) return signUpEmail.error.message;
    if (signInGoogle.error) return signInGoogle.error.message;
    return null;
  }, [signInEmail.error, signUpEmail.error, signInGoogle.error]);

  return {
    signInEmail,
    signUpEmail,
    signInGoogle,
    isPending,
    errorMessage,
  };
}
