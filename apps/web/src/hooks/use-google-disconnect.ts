"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { API_URL } from "@/lib/env";
import { GOOGLE_STATUS_QUERY_KEY } from "./use-google-status";
import { SCAN_STATUS_QUERY_KEY } from "./use-scan-status";
import { THREADS_QUERY_KEY } from "./use-threads";

/**
 * Posts to /api/integrations/google/disconnect.
 *
 * Server-side: revokes the OAuth grant at Google, deletes the Better
 * Auth account row, queues an Inngest cleanup that wipes the user's
 * gmail-derived data. Returns once steps 1-2 are done (step 3 is
 * background).
 *
 * On success we invalidate every cached read that depends on the
 * Google linkage so the UI flips back to the "Connect" state without
 * a manual refresh.
 */
export function useGoogleDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ revoked: boolean }> => {
      const res = await fetch(
        `${API_URL}/api/integrations/google/disconnect`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(`Disconnect failed (${res.status})`);
      }
      return (await res.json()) as { revoked: boolean };
    },
    onSuccess: () => {
      toast.success(
        "Google disconnected. Your inbox data is being deleted in the background.",
      );
      qc.invalidateQueries({ queryKey: GOOGLE_STATUS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SCAN_STATUS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
