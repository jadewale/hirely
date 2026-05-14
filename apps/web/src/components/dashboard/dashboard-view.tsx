"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HirelyBrand, OnboardingBackdrop } from "@/components/onboarding/_shared";

export interface DashboardUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
}

export interface DashboardViewProps {
  /** When true, render a loading shell instead of the main surface. */
  isLoading: boolean;
  /** Present only when `isLoading` is false. */
  user?: DashboardUser;
  /** Disables the sign-out button while the mutation is in flight. */
  isSigningOut: boolean;
  onSignOut: () => void;
  onRestartOnboarding: () => void;
}

/**
 * Authenticated landing surface (View).
 *
 * Pure presentation: takes resolved state + callbacks from the dashboard
 * ViewModel and renders. Don't call hooks here -- session + sign-out live
 * in `useDashboardVm`.
 */
export function DashboardView({
  isLoading,
  user,
  isSigningOut,
  onSignOut,
  onRestartOnboarding,
}: DashboardViewProps) {
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground md:text-sm">
          <span>
            Signed in as <b className="text-foreground">{user.email}</b>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isSigningOut}
            onClick={onSignOut}
          >
            {isSigningOut ? "Signing out\u2026" : "Sign out"}
          </Button>
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 py-10 md:px-9">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          You are signed in. The real pipeline / inbox / drafts surfaces land
          here next &mdash; for now this page is a smoke test that the auth
          loop works end-to-end.
        </p>

        <Card className="mt-6 p-5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Session
          </div>
          <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs text-foreground/80">{user.id}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
            {user.name ? (
              <>
                <dt className="text-muted-foreground">Name</dt>
                <dd>{user.name}</dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">Email verified</dt>
            <dd>{user.emailVerified ? "Yes" : "No"}</dd>
          </dl>
        </Card>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button
            onClick={onRestartOnboarding}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Restart onboarding flow
          </Button>
        </div>
      </div>
    </div>
  );
}
