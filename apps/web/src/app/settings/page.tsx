"use client";

import { SettingsView } from "@/components/settings/settings-view";
import { useSettingsVm } from "@/hooks/use-settings-vm";

export default function SettingsPage() {
  const vm = useSettingsVm();
  return (
    <SettingsView
      isLoading={vm.isLoading}
      user={vm.user}
      google={vm.google}
      isConnecting={vm.isConnecting}
      isDisconnecting={vm.isDisconnecting}
      onBack={vm.actions.backToDashboard}
      onConnect={vm.actions.connect}
      onDisconnect={vm.actions.disconnect}
    />
  );
}
