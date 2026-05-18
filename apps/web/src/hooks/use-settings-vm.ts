"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useGoogleConnect } from "@/hooks/use-google-connect";
import { useGoogleDisconnect } from "@/hooks/use-google-disconnect";
import { useGoogleStatus } from "@/hooks/use-google-status";
import { useSession } from "@/lib/auth-client";

/**
 * ViewModel for `/settings`.
 *
 * Single concern for v1: managing the Google integration (connect /
 * reconnect / disconnect). Future surface area (notification prefs,
 * resume management) will branch off this hook.
 */
export function useSettingsVm() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  React.useEffect(() => {
    if (!sessionPending && !session) {
      router.replace("/login");
    }
  }, [session, sessionPending, router]);

  const status = useGoogleStatus({
    enabled: !sessionPending && !!session,
  });
  const connect = useGoogleConnect({ callbackPath: "/settings" });
  const disconnect = useGoogleDisconnect();

  const actions = React.useMemo(
    () => ({
      backToDashboard: () => router.push("/dashboard"),
      connect: () => connect.mutate(),
      disconnect: () => disconnect.mutate(),
    }),
    [router, connect, disconnect],
  );

  return {
    isLoading: sessionPending || !session,
    user: session?.user,
    google: status.data,
    isConnecting: connect.isPending,
    isDisconnecting: disconnect.isPending,
    actions,
  };
}
