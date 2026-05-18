"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import {
  HirelyBrand,
  GoogleG,
  OnboardingBackdrop,
  StepIndicator,
} from "./_shared";
import { ONBOARDING_USER } from "@/lib/onboarding-data";

export interface GmailConnectProps {
  userEmail?: string;
  onAuthorize?: () => void;
  onSkip?: () => void;
  onSwitchAccount?: () => void;
  isPending?: boolean;
}

const PERMISSIONS = [
  {
    emoji: "\u{1F4E5}",
    title: "Read job-related emails",
    body: "Recruiters, application confirmations, interview invites, rejections. We filter by sender + content.",
    required: true,
  },
  {
    emoji: "\u{1F3F7}\uFE0F",
    title: "Apply Gmail labels",
    body: "We label classified threads (e.g. Hirely / Interview) so they stay organized in your normal inbox.",
    required: true,
  },
  {
    emoji: "\u{1F4E4}",
    title: "Send replies as drafts",
    body: "AI-drafted responses land in Drafts. Nothing sends without your tap.",
    required: true,
  },
  {
    emoji: "\u{1F4C5}",
    title: "See & add calendar events",
    body: "Detect interview conflicts and drop confirmed interviews onto your calendar. We only touch events Hirely creates.",
    required: true,
  },
];

const STEPS = [
  { n: 1, label: "Account" },
  { n: 2, label: "Connect Google" },
  { n: 3, label: "Scan inbox" },
  { n: 4, label: "Your pipeline" },
];

export function GmailConnect({
  userEmail = ONBOARDING_USER.email,
  onAuthorize,
  onSkip,
  onSwitchAccount,
  isPending = false,
}: GmailConnectProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
          Signed in as <b className="text-foreground">{userEmail}</b>
          <button
            type="button"
            onClick={onSwitchAccount}
            className="cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Switch
          </button>
        </div>
      </header>

      <div className="relative flex justify-center px-6 pb-16 md:px-9">
        <div className="w-full max-w-3xl">
          <div className="mb-5">
            <StepIndicator steps={STEPS} current={2} />
          </div>

          <Card className="p-7 md:p-9">
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40">
                <GoogleG size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight md:text-[22px]">
                  Connect your Google account
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Gmail + Calendar. One consent screen, no more setup &mdash;
                  Hirely runs itself from here.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {PERMISSIONS.map((p) => (
                <div
                  key={p.title}
                  className="flex gap-3 rounded-lg border bg-muted/30 p-3.5"
                >
                  <div className="mt-0.5 text-[22px] leading-none">
                    {p.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="text-[13px] font-semibold">{p.title}</div>
                      <Badge
                        variant={p.required ? "default" : "secondary"}
                        className={
                          p.required
                            ? "h-4 bg-indigo-100 px-1.5 font-mono text-[9.5px] tracking-wider text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                            : "h-4 px-1.5 font-mono text-[9.5px] tracking-wider"
                        }
                      >
                        {p.required ? "REQUIRED" : "OPTIONAL"}
                      </Badge>
                    </div>
                    <div className="text-[11.5px] leading-relaxed text-muted-foreground">
                      {p.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <b>We never read personal emails.</b> Hirely only opens threads
                matching job-related patterns (subject keywords, known
                recruiting domains). Disconnect any time &mdash; your data is
                wiped within 24h.{" "}
                <a className="ml-1 cursor-pointer font-semibold hover:underline">
                  How we handle data &rarr;
                </a>
              </AlertDescription>
            </Alert>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Button
                size="lg"
                onClick={onAuthorize}
                disabled={isPending}
                className="flex-1 gap-2.5 bg-foreground text-background hover:bg-foreground/90"
              >
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white">
                  <GoogleG size={14} />
                </span>
                {isPending ? "Opening Google\u2026" : "Authorize with Google"}
              </Button>
              <Button size="lg" variant="outline" onClick={onSkip}>
                I&apos;ll do this later
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
