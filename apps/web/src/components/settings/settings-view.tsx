"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HirelyBrand, OnboardingBackdrop } from "@/components/onboarding/_shared";

export interface SettingsViewProps {
  isLoading: boolean;
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  google?: {
    linked: boolean;
    email: string | null;
    inboxConnected: boolean;
    calendarConnected: boolean;
  };
  isConnecting: boolean;
  isDisconnecting: boolean;
  onBack: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * Settings surface (View). Minimal for v1: lets the user see what
 * Google scopes are linked and disconnect.
 *
 * Disconnect carries a confirm-by-typing UX trick: the user has to
 * click a primary destructive button. We'd add a typed-confirmation
 * step (e.g. "type DISCONNECT to proceed") if real-world traffic
 * suggested accidental clicks; for the demo, one click is fine.
 */
export function SettingsView({
  isLoading,
  user,
  google,
  isConnecting,
  isDisconnecting,
  onBack,
  onConnect,
  onDisconnect,
}: SettingsViewProps) {
  if (isLoading || !user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background text-foreground">
        <OnboardingBackdrop />
        <p className="relative text-sm text-muted-foreground">
          Loading&hellip;
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to dashboard
        </Button>
      </header>

      <main className="relative mx-auto max-w-2xl px-6 pb-16 md:px-9">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage your connected accounts.
        </p>

        <Card className="mt-6 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold">Google account</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Powers inbox classification, draft generation, and calendar
                scheduling.
              </p>
            </div>
            {google?.linked ? (
              <Badge className="border-emerald-200 bg-emerald-50 px-2 font-mono text-[10px] tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="outline" className="px-2 font-mono text-[10px] tracking-wider">
                NOT CONNECTED
              </Badge>
            )}
          </div>

          <div className="mt-4 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[12.5px]">
            <span className="text-muted-foreground">Linked email</span>
            <span className="text-foreground">
              {google?.email ?? user.email}
            </span>
            <span className="text-muted-foreground">Gmail scopes</span>
            <span className={google?.inboxConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              {google?.inboxConnected ? "Granted" : "Not granted"}
            </span>
            <span className="text-muted-foreground">Calendar scopes</span>
            <span className={google?.calendarConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              {google?.calendarConnected ? "Granted" : "Not granted"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {google?.inboxConnected && google?.calendarConnected ? null : (
              <Button
                size="sm"
                disabled={isConnecting}
                onClick={onConnect}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isConnecting
                  ? "Opening Google\u2026"
                  : google?.linked
                    ? "Grant missing scopes"
                    : "Connect Google"}
              </Button>
            )}
            {google?.linked ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isDisconnecting}
                onClick={onDisconnect}
                className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                {isDisconnecting ? "Disconnecting\u2026" : "Disconnect Google"}
              </Button>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Disconnecting revokes our access at Google and deletes the inbox
            data we cached. The labels we created (Hirely / Applied, etc.)
            stay in your Gmail account &mdash; they&apos;re yours.
          </p>
        </Card>
      </main>
    </div>
  );
}
