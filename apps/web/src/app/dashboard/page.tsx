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
      onSignOut={vm.actions.signOut}
      onRestartOnboarding={vm.actions.restartOnboarding}
    />
  );
}
