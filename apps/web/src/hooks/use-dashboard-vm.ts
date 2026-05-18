"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useGoogleStatus } from "@/hooks/use-google-status";
import { useScanStatus } from "@/hooks/use-scan-status";
import {
  useRequestDraft,
  useThreads,
  type ThreadRow,
} from "@/hooks/use-threads";
import { authClient, useSession } from "@/lib/auth-client";

/**
 * ViewModel for `/dashboard`.
 *
 * Composes the session + threads + scan-status reads, exposes the
 * actions the dashboard surfaces fire (sign out, request draft,
 * disconnect). Pure View renders are the responsibility of
 * `DashboardView`.
 */
export function useDashboardVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  React.useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [session, sessionPending, router]);

  const googleStatus = useGoogleStatus({
    enabled: !sessionPending && !!session,
  });
  // Scan-status polls server-side while the run is in flight (the hook
  // turns its own polling off on terminal state). On the dashboard we
  // keep the read enabled so a user who lands here mid-scan sees the
  // "still scanning" banner.
  const scanStatus = useScanStatus({
    enabled:
      !sessionPending &&
      !!session &&
      (googleStatus.data?.inboxConnected ?? false),
  });
  const threads = useThreads({
    enabled: !sessionPending && !!session,
  });

  const requestDraft = useRequestDraft();

  const signOut = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      toast.success("Signed out.");
      router.replace("/login");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Group threads by stage for the pipeline columns. Order matters --
  // most actionable stages first (interview > offer > screen > applied).
  const byStage = React.useMemo(() => {
    const order: ThreadRow["stage"][] = [
      "interview",
      "offer",
      "phone_screen",
      "applied",
      "rejected",
      "ghosted",
    ];
    const map = new Map<ThreadRow["stage"], ThreadRow[]>();
    for (const stage of order) map.set(stage, []);
    for (const row of threads.data ?? []) {
      if (!map.has(row.stage)) continue;
      map.get(row.stage)!.push(row);
    }
    return Array.from(map.entries()).map(([stage, rows]) => ({
      stage,
      rows,
    }));
  }, [threads.data]);

  const actions = React.useMemo(
    () => ({
      signOut: () => signOut.mutate(),
      restartOnboarding: () => router.push("/onboarding"),
      requestDraft: (id: string) => requestDraft.mutate(id),
      openSettings: () => router.push("/settings"),
    }),
    [signOut, router, requestDraft],
  );

  return {
    isLoading: sessionPending || !session,
    user: session?.user,
    isSigningOut: signOut.isPending,
    google: googleStatus.data,
    scan: scanStatus.data,
    threads: byStage,
    isLoadingThreads: threads.isLoading,
    draftPending: requestDraft.isPending,
    actions,
  };
}
