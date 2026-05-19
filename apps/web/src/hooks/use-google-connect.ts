"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { GOOGLE_INBOX_SCOPES } from "@/lib/google-scopes";

import { GOOGLE_STATUS_QUERY_KEY } from "./use-google-status";

interface BetterAuthError {
  message?: string;
  status?: number;
  code?: string;
}
interface BetterAuthResult {
  data?: unknown;
  error?: BetterAuthError | null;
}

/**
 * Starts the Google OAuth scope-upgrade flow.
 *
 * Calls Better Auth's `linkSocial` with the Gmail + Calendar scopes; the
 * browser is then redirected to Google's consent screen. After the user
 * grants, Google returns to `/api/auth/callback/google`, Better Auth
 * stores the new tokens + scopes on the existing account row, then
 * redirects to the `callbackURL` below.
 *
 * The orchestrator's `useGoogleStatus` query is invalidated on the way
 * out so when the user lands back on `/onboarding`, the refetched
 * status reports `inboxConnected: true` and the step machine advances
 * to "scanning" without any explicit dispatch.
 */
export function useGoogleConnect(opts: { callbackPath?: string } = {}) {
  const { callbackPath = "/onboarding" } = opts;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const callbackURL =
        typeof window === "undefined"
          ? callbackPath
          : `${window.location.origin}${callbackPath}`;
      // Failure destination. Without this, Better Auth falls back to
      // BETTER_AUTH_URL (the API origin) on error -- e.g. user cancels
      // the consent screen, or Google returns a transport error -- and
      // the user gets the bare Nest 404 page. Landing them back on
      // /onboarding with `?error=<reason>` lets the page surface a toast.
      const errorCallbackURL = callbackURL;

      const result = (await authClient.linkSocial({
        provider: "google",
        scopes: GOOGLE_INBOX_SCOPES as string[],
        callbackURL,
        errorCallbackURL,
      })) as BetterAuthResult;

      if (result.error) {
        throw new Error(
          result.error.message ?? "Could not start Google connection.",
        );
      }
      // linkSocial redirects the browser when it returns a URL. We
      // invalidate proactively so when the user comes back the
      // post-OAuth status is fetched immediately rather than waiting
      // for the 30s stale window to expire.
      await queryClient.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
