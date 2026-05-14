// Brand mark, Google "G" icon, and a tiny step-indicator. All theme-aware.

import * as React from "react";
import { cn } from "@/lib/utils";

export function HirelyBrand({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const dims =
    size === "lg"
      ? { box: "h-9 w-9 text-lg", type: "text-[22px]" }
      : { box: "h-7 w-7 text-sm", type: "text-[17px]" };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-indigo-600 font-bold text-white",
          dims.box,
        )}
      >
        H
      </div>
      <div className={cn("font-bold tracking-tight", dims.type)}>Hirely</div>
    </div>
  );
}

export function GoogleG({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.2 5.2c-.4.4 6.5-4.7 6.5-14.8 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

// Decorative radial backdrop used on all 4 onboarding screens.
export function OnboardingBackdrop() {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        "bg-[radial-gradient(900px_600px_at_85%_-10%,theme(colors.indigo.100),transparent_60%),radial-gradient(700px_500px_at_-10%_90%,theme(colors.amber.100),transparent_60%)]",
        "dark:bg-[radial-gradient(900px_600px_at_85%_-10%,theme(colors.indigo.500/20%),transparent_60%),radial-gradient(700px_500px_at_-10%_90%,theme(colors.amber.500/12%),transparent_60%)]",
      )}
    />
  );
}

export type StepDef = { n: number; label: string };

export function StepIndicator({
  steps,
  current,
}: {
  steps: StepDef[];
  current: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-indigo-600 text-white",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "\u2713" : s.n}
              </div>
              <span
                className={cn(
                  "text-xs",
                  active && "font-semibold text-foreground",
                  done && "font-medium text-foreground/80",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="hidden h-px max-w-[60px] flex-1 bg-border sm:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
