"use client";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useDashboardVm } from "@/hooks/use-dashboard-vm";

/**
 * Authenticated landing route.
 *
 * Thin shell: wires the dashboard ViewModel to the DashboardView.
 */
export default function DashboardPage() {
  const vm = useDashboardVm();

  return (
    <DashboardView
      isLoading={vm.isLoading}
      user={vm.user}
      isSigningOut={vm.isSigningOut}
      google={vm.google}
      scan={vm.scan}
      threads={vm.threads}
      isLoadingThreads={vm.isLoadingThreads}
      draftPending={vm.draftPending}
      onSignOut={vm.actions.signOut}
      onRestartOnboarding={vm.actions.restartOnboarding}
      onRequestDraft={vm.actions.requestDraft}
      onOpenSettings={vm.actions.openSettings}
    />
  );
}
