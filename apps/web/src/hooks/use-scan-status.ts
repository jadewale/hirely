"use client";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/env";

export interface InboxScanStatus {
  status: "idle" | "listing" | "classifying" | "completed" | "failed";
  runId: string | null;
  targetTotal: number;
  discoveredTotal: number;
  classifiedCount: number;
  batchesTotal: number;
  batchesCompleted: number;
  completedAt: string | null;
  errorMessage: string | null;
}

export const SCAN_STATUS_QUERY_KEY = [
  "integrations",
  "google",
  "scan-status",
] as const;

/**
 * Polls the backend for the user's most recent inbox scan progress.
 *
 * Only enabled during the onboarding scanning step + on the dashboard
 * during an in-progress scan. The poll interval is dynamic: 1.2s while
 * the scan is active, off once the row reports terminal state. Why a
 * dynamic interval instead of a flat poll? Polling the dashboard at
 * 1.2s after a scan completed wastes ~1 request/second/active user
 * forever; flipping to off on completion stops that without us having
 * to plumb websockets.
 */
export function useScanStatus({
  enabled = true,
  pollIntervalMs = 1200,
}: { enabled?: boolean; pollIntervalMs?: number } = {}) {
  return useQuery({
    queryKey: SCAN_STATUS_QUERY_KEY,
    queryFn: async (): Promise<InboxScanStatus> => {
      const res = await fetch(
        `${API_URL}/api/integrations/google/scan-status`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(
          `Scan status check failed (${res.status} ${res.statusText})`,
        );
      }
      return (await res.json()) as InboxScanStatus;
    },
    enabled,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === "completed" || s === "failed") return false;
      return pollIntervalMs;
    },
    // No staleTime: every poll is a fresh read, the cache is just for
    // render parity between the onboarding and dashboard surfaces.
  });
}
