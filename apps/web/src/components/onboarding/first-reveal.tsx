"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HirelyBrand, OnboardingBackdrop } from "./_shared";
import {
  FIRST_REVEAL_STATS,
  PIPELINE_PREVIEW,
  toneClasses,
} from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

export interface FirstRevealProps {
  applicationCount?: number;
  onEnterApp?: () => void;
  onTakeTour?: () => void;
}

export function FirstReveal({
  applicationCount = 23,
  onEnterApp,
  onTakeTour,
}: FirstRevealProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Gmail connected &middot; 1,284 emails scanned
        </div>
      </header>

      <div className="relative px-6 pb-12 md:px-9 lg:px-16">
        {/* Headline */}
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 font-mono text-[11.5px] font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            {"\u2713"} READY
          </Badge>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-[38px]">
            We found{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              {applicationCount} applications
            </span>{" "}
            in your inbox.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            They&apos;re already sorted into your pipeline. One needs your
            attention today.
          </p>
        </div>

        {/* Stat row */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FIRST_REVEAL_STATS.map((s) => (
            <Card
              key={s.label}
              className={cn(
                "p-3.5",
                s.flag &&
                  "border-amber-300 shadow-[0_0_0_3px_theme(colors.amber.50)] dark:shadow-[0_0_0_3px_theme(colors.amber.500/15%)]",
              )}
            >
              <div className="text-[11px] font-medium text-muted-foreground">
                {s.label}
              </div>
              <div
                className={cn(
                  "mt-1 text-[26px] font-bold leading-none tracking-tight",
                  s.flag
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-foreground",
                )}
              >
                {s.value}
              </div>
              <div
                className={cn(
                  "mt-0.5 font-mono text-[11px]",
                  s.flag
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-muted-foreground/70",
                )}
              >
                {s.hint}
              </div>
            </Card>
          ))}
        </div>

        {/* Featured action */}
        <Card className="mb-5 flex items-center gap-4 p-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold"
            style={{
              background: "oklch(0.88 0.05 140)",
              color: "oklch(0.32 0.12 140)",
            }}
          >
            R
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm">Ramp &middot; PM, Bill Pay</b>
              <Badge className="h-4 bg-emerald-100 px-1.5 font-mono text-[10px] tracking-wider text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20">
                {"\u2605"} OFFER
              </Badge>
              <Badge className="h-4 bg-amber-100 px-1.5 font-mono text-[10px] tracking-wider text-amber-700 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/20">
                NEEDS REPLY
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Eric (recruiter) sent the formal offer Monday &mdash; $240k base
              + 0.18% equity. Decision needed by Friday.
            </div>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            Open offer
          </Button>
        </Card>

        {/* Pipeline preview */}
        <Card className="mb-5 flex flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13.5px] font-bold">
              Your pipeline &middot; preview
            </h3>
            <span className="font-mono text-[11.5px] text-muted-foreground">
              auto-generated &middot; editable
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {PIPELINE_PREVIEW.map((col) => {
              const tc = toneClasses[col.tone];
              const highlight = "highlight" in col ? col.highlight : false;
              return (
                <div
                  key={col.name}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2.5",
                    highlight &&
                      "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10",
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", tc.dot)} />
                    <span className="text-[11px] font-semibold">
                      {col.name}
                    </span>
                    <span className="ml-auto rounded bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                      {col.items.length}
                    </span>
                  </div>
                  {col.items.map((it, j) => (
                    <div
                      key={j}
                      className={cn(
                        "rounded border bg-card px-1.5 py-1 text-[11.5px]",
                        it.startsWith("+")
                          ? "text-muted-foreground"
                          : "font-medium text-foreground/85",
                      )}
                    >
                      {it}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button
            size="lg"
            onClick={onEnterApp}
            className="bg-indigo-600 px-6 hover:bg-indigo-700"
          >
            Take me to my pipeline &rarr;
          </Button>
          <Button size="lg" variant="outline" onClick={onTakeTour}>
            Show me a quick tour
          </Button>
        </div>
      </div>
    </div>
  );
}
