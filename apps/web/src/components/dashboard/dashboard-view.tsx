"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HirelyBrand, OnboardingBackdrop } from "@/components/onboarding/_shared";
import type { ThreadRow } from "@/hooks/use-threads";
import { toneClasses } from "@/lib/onboarding-data";
import { STAGE_META } from "@/lib/stage-meta";
import { cn } from "@/lib/utils";

export interface DashboardUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
}

export interface DashboardViewProps {
  isLoading: boolean;
  user?: DashboardUser;
  isSigningOut: boolean;
  google?: {
    linked: boolean;
    inboxConnected: boolean;
    calendarConnected: boolean;
  };
  scan?: {
    status: "idle" | "listing" | "classifying" | "completed" | "failed";
    discoveredTotal: number;
    classifiedCount: number;
    targetTotal: number;
  };
  threads: { stage: ThreadRow["stage"]; rows: ThreadRow[] }[];
  isLoadingThreads: boolean;
  draftPending: boolean;
  onSignOut: () => void;
  onRestartOnboarding: () => void;
  onRequestDraft: (id: string) => void;
  onOpenSettings: () => void;
}

/**
 * Authenticated landing surface (View).
 *
 * Pure presentation. Renders three regions:
 *
 *   - Header strip: brand, signed-in chip, "Settings".
 *   - Scan banner: visible only while a scan is in flight, shows the
 *     progress bar so a user who lands here mid-scan understands the
 *     pipeline is partial.
 *   - Pipeline grid: six columns (one per surfaced stage), each holding
 *     ThreadCard children. Empty stages render a soft "Nothing here
 *     yet" placeholder so the layout doesn't collapse during the first
 *     few minutes after connect.
 */
export function DashboardView({
  isLoading,
  user,
  isSigningOut,
  google,
  scan,
  threads,
  isLoadingThreads,
  draftPending,
  onSignOut,
  onRequestDraft,
  onOpenSettings,
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

  const scanning =
    scan && (scan.status === "listing" || scan.status === "classifying");
  const denom = scan?.discoveredTotal || scan?.targetTotal || 1;
  const scanPct = Math.round(((scan?.classifiedCount ?? 0) / denom) * 100);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground md:text-sm">
          <span className="hidden sm:inline">
            Signed in as <b className="text-foreground">{user.email}</b>
          </span>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            Settings
          </Button>
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

      <main className="relative mx-auto max-w-7xl px-6 pb-16 md:px-9">
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Your pipeline
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {google?.inboxConnected
                ? "Classifications, drafts, and calendar conflicts \u2014 all in one place."
                : "Connect your Google account from Settings to start populating the pipeline."}
            </p>
          </div>
          {google?.calendarConnected ? (
            <Badge className="hidden h-7 border-emerald-200 bg-emerald-50 px-2.5 font-mono text-[10px] tracking-wider text-emerald-700 md:inline-flex dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              CALENDAR LINKED
            </Badge>
          ) : null}
        </div>

        {scanning ? (
          <Card className="mt-6 flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                </span>
                Scan in progress
              </span>
              <span className="font-mono text-muted-foreground">
                {scan?.classifiedCount ?? 0} / {denom} classified
              </span>
            </div>
            <Progress
              value={scanPct}
              className="h-2"
              indicatorClassName="bg-indigo-600"
            />
            <p className="text-xs text-muted-foreground">
              {scan?.status === "listing"
                ? "Discovering threads in your inbox\u2026"
                : "Classifying threads. New rows appear here as each batch finishes."}
            </p>
          </Card>
        ) : null}

        {isLoadingThreads ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Loading your threads&hellip;
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {threads.map(({ stage, rows }) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                rows={rows}
                draftPending={draftPending}
                onRequestDraft={onRequestDraft}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface PipelineColumnProps {
  stage: ThreadRow["stage"];
  rows: ThreadRow[];
  draftPending: boolean;
  onRequestDraft: (id: string) => void;
}

function PipelineColumn({
  stage,
  rows,
  draftPending,
  onRequestDraft,
}: PipelineColumnProps) {
  const meta = STAGE_META[stage];
  const tc = toneClasses[meta.tone];

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", tc.dot)} />
          <h2 className="text-sm font-bold">{meta.label}</h2>
        </div>
        <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px]">
          {rows.length}
        </Badge>
      </div>
      <p className="text-[11.5px] text-muted-foreground">{meta.helper}</p>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-[11.5px] text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.slice(0, 8).map((row) => (
            <ThreadCard
              key={row.id}
              row={row}
              draftPending={draftPending}
              onRequestDraft={onRequestDraft}
            />
          ))}
          {rows.length > 8 ? (
            <li className="px-2 text-[11px] text-muted-foreground">
              + {rows.length - 8} more
            </li>
          ) : null}
        </ul>
      )}
    </Card>
  );
}

interface ThreadCardProps {
  row: ThreadRow;
  draftPending: boolean;
  onRequestDraft: (id: string) => void;
}

function ThreadCard({ row, draftPending, onRequestDraft }: ThreadCardProps) {
  // Strip just the display-name part out of "Jane Doe <jane@acme.com>"
  // for a friendlier card header. Falls back to the full string if the
  // header didn't include a bracketed address.
  const displayName = row.sender.replace(/\s*<[^>]+>\s*$/, "") || row.sender;
  const received = new Date(row.receivedAt);
  const receivedLabel = received.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const draftReady = row.draftStatus === "ready";
  const draftPendingForRow = row.draftStatus === "pending";

  return (
    <li className="rounded-md border border-border/60 bg-card/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{displayName}</div>
          <div className="truncate text-[12px] text-muted-foreground">
            {row.subject}
          </div>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {receivedLabel}
        </span>
      </div>
      {row.snippet ? (
        <p className="mt-1.5 line-clamp-2 text-[11.5px] text-muted-foreground">
          {row.snippet}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {draftReady ? (
          <Link
            href={`https://mail.google.com/mail/u/0/#drafts/${row.gmailDraftId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            Open draft in Gmail
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={draftPending || draftPendingForRow}
            onClick={() => onRequestDraft(row.id)}
            className="h-7 gap-1 px-2.5 text-[11px]"
          >
            <Sparkles className="h-3 w-3" />
            {draftPendingForRow
              ? "Drafting\u2026"
              : row.draftStatus === "failed"
                ? "Retry draft"
                : "Draft reply"}
          </Button>
        )}
        <Link
          href={`https://mail.google.com/mail/u/0/#inbox/${row.gmailThreadId}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          View thread &rarr;
        </Link>
      </div>
    </li>
  );
}
