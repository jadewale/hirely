"use client";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/env";

export interface GoogleStatus {
  linked: boolean;
  email: string | null;
  inboxConnected: boolean;
  calendarConnected: boolean;
}

export const GOOGLE_STATUS_QUERY_KEY = ["integrations", "google", "status"] as const;

/**
 * Polls the API for which Google scopes the signed-in user has granted.
 *
 * Used by the onboarding orchestrator to know whether to advance from
 * step 2 ("connect") to step 3 ("scanning"). After a `linkSocial`
 * redirect we invalidate this query — the refetch returns
 * `inboxConnected: true` and the VM advances on its own.
 *
 * Gated on `enabled` so we don't fire a request before the user is
 * signed in (would just 401 anyway and waste a round-trip).
 */
export function useGoogleStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: GOOGLE_STATUS_QUERY_KEY,
    queryFn: async (): Promise<GoogleStatus> => {
      const res = await fetch(`${API_URL}/api/integrations/google/status`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(
          `Google status check failed (${res.status} ${res.statusText})`,
        );
      }
      return (await res.json()) as GoogleStatus;
    },
    enabled,
    // The status barely ever changes for a given session — once linked
    // it stays linked until the user explicitly disconnects. A 30s stale
    // window keeps re-renders cheap without making the UI feel laggy
    // when we *do* invalidate it after a linkSocial round-trip.
    staleTime: 30_000,
  });
}
