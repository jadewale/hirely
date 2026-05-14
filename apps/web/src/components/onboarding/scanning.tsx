"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap } from "lucide-react";
import { HirelyBrand, OnboardingBackdrop } from "./_shared";
import {
  SCAN_PROGRESS,
  FOUND_STAGES,
  LIVE_TRACE,
  toneClasses,
} from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

export interface ScanningProps {
  /** Override progress for testing. Otherwise uses SCAN_PROGRESS from data file. */
  scanned?: number;
  total?: number;
  etaSeconds?: number;
}

export function Scanning({
  scanned = SCAN_PROGRESS.scanned,
  total = SCAN_PROGRESS.total,
  etaSeconds = SCAN_PROGRESS.etaSeconds,
}: ScanningProps) {
  const pct = Math.round((scanned / total) * 100);
  const maxCount = Math.max(...FOUND_STAGES.map((s) => s.count));

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <div className="text-xs text-muted-foreground md:text-sm">
          Step 3 of 4 &middot; Scanning inbox
        </div>
      </header>

      <div className="relative grid grid-cols-1 gap-6 px-6 pb-12 md:px-9 lg:grid-cols-2 lg:gap-8 lg:px-16">
        {/* Left — progress */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-indigo-50 px-2.5 py-1 dark:bg-indigo-500/15">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
            </span>
            <span className="font-mono text-[11px] font-semibold tracking-wider text-indigo-700 dark:text-indigo-300">
              AI WORKING
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl lg:text-[40px]">
            Reading your inbox&hellip;
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Classifying threads from the last 12 months. Personal email is
            skipped entirely. This takes about 60 seconds.
          </p>

          <div className="mt-7">
            <div className="mb-2 flex justify-between text-[12.5px]">
              <span className="font-medium">
                <span className="font-mono">{scanned.toLocaleString()}</span>{" "}
                of {total.toLocaleString()} emails scanned
              </span>
              <span className="font-mono text-muted-foreground">{pct}%</span>
            </div>
            <Progress
              value={pct}
              className="h-2"
              indicatorClassName="bg-indigo-600"
            />
            <div className="mt-2 font-mono text-[11.5px] text-muted-foreground">
              ~{etaSeconds} seconds remaining
            </div>
          </div>

          {/* Live trace */}
          <Card className="mt-6 h-[140px] overflow-hidden p-3">
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
              Live trace
            </div>
            <div className="relative">
              {LIVE_TRACE.map((l, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[44px_1fr_auto] items-center gap-3 py-0.5 font-mono text-[11.5px]"
                  style={{ opacity: 1 - i * 0.15 }}
                >
                  <span className="text-muted-foreground/70">{l.t}</span>
                  <span className="text-foreground/85">{l.co}</span>
                  <span
                    className={cn("font-semibold", toneClasses[l.tone].text)}
                  >
                    {l.stage}
                  </span>
                </div>
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
            </div>
          </Card>
        </div>

        {/* Right — preview pipeline */}
        <Card className="flex flex-col p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-bold">Found so far</h3>
            <Badge
              variant="outline"
              className="h-5 border-emerald-200 bg-emerald-50 px-1.5 font-mono text-[10px] tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              &bull; UPDATING
            </Badge>
          </div>
          <div className="mb-4 text-[11.5px] text-muted-foreground">
            23 job applications across {FOUND_STAGES.length} stages
          </div>

          <div className="flex flex-1 flex-col gap-2.5">
            {FOUND_STAGES.map((s) => {
              const w = (s.count / maxCount) * 100;
              const tc = toneClasses[s.tone];
              return (
                <div key={s.name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", tc.dot)}
                      />
                      <b>{s.name}</b>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {s.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        tc.bar,
                      )}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Spotted a <b>final-round at Ramp</b> from Monday &mdash; looks
              like it needs your reply. We&apos;ll surface it first.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </div>
  );
}
