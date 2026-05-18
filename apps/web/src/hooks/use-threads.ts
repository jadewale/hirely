"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { API_URL } from "@/lib/env";

export type PipelineStage =
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

export type DraftStatus = "idle" | "pending" | "ready" | "failed";

export interface ThreadRow {
  id: string;
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string | null;
  receivedAt: string;
  stage: PipelineStage;
  confidence: number;
  appliedLabelIds: string[] | null;
  draftStatus: DraftStatus;
  gmailDraftId: string | null;
  draftBody: string | null;
  draftedAt: string | null;
}

export const THREADS_QUERY_KEY = ["threads"] as const;
export const threadQueryKey = (id: string) => ["threads", id] as const;

/**
 * Returns every classified thread for the user, ordered most-recent
 * first. Polls every 4s while ANY thread has draftStatus="pending" so
 * draft completion ticks into the UI without manual refetches.
 */
export function useThreads({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: THREADS_QUERY_KEY,
    enabled,
    queryFn: async (): Promise<ThreadRow[]> => {
      const res = await fetch(`${API_URL}/api/threads`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Threads fetch failed (${res.status})`);
      }
      return (await res.json()) as ThreadRow[];
    },
    refetchInterval: (query) => {
      const rows = query.state.data;
      const anyPending = rows?.some((r) => r.draftStatus === "pending");
      return anyPending ? 4000 : false;
    },
    // Threads are write-rarely (the inbox-sync runs are minutes apart
    // in steady state). A 60s stale window keeps tab-switch revisits
    // cheap.
    staleTime: 60_000,
  });
}

/**
 * Per-thread fetch. Used by the thread-detail surfaces -- not exposed
 * on the pipeline view since the list endpoint already returns full
 * rows.
 */
export function useThread(id: string | undefined) {
  return useQuery({
    queryKey: id ? threadQueryKey(id) : ["threads", "none"],
    enabled: !!id,
    queryFn: async (): Promise<ThreadRow> => {
      const res = await fetch(`${API_URL}/api/threads/${id}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Thread fetch failed (${res.status})`);
      }
      return (await res.json()) as ThreadRow;
    },
  });
}

/**
 * Asks the server to generate a reply draft for the given thread.
 *
 * Optimistic UX: we flip the local cache to draftStatus="pending"
 * immediately so the spinner appears even before the network hop
 * resolves. The Inngest fn does the actual work; the threads list
 * poll picks up the transition to "ready".
 */
export function useRequestDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gmailMessageRowId: string): Promise<ThreadRow> => {
      const res = await fetch(
        `${API_URL}/api/threads/${gmailMessageRowId}/draft`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(`Draft request failed (${res.status})`);
      }
      return (await res.json()) as ThreadRow;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: THREADS_QUERY_KEY });
      const previous = qc.getQueryData<ThreadRow[]>(THREADS_QUERY_KEY);
      qc.setQueryData<ThreadRow[]>(THREADS_QUERY_KEY, (rows) =>
        rows?.map((r) =>
          r.id === id ? { ...r, draftStatus: "pending" } : r,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(THREADS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}
