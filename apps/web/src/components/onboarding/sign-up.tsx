"use client";

import * as React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { GoogleG, HirelyBrand } from "./_shared";

export interface SignUpProps {
  /** Click handler for the primary "Continue with Google" CTA. */
  onGoogleSignIn?: () => void;
  /** Click handler for "Continue with LinkedIn". */
  onLinkedInSignIn?: () => void;
  /** Submit handler for the email + password + name form. */
  onEmailSignUp?: (input: {
    email: string;
    password: string;
    name: string;
  }) => void;
  /** Click handler for the "Sign in" link in the header. */
  onSignIn?: () => void;
  /** Disables auth buttons + spins the submit label while a request runs. */
  isPending?: boolean;
  /** Destructive alert above the form when set. */
  errorMessage?: string | null;
}

const FACE_PILE = [
  { hue: 140, init: "JK" },
  { hue: 220, init: "MR" },
  { hue: 30, init: "AN" },
  { hue: 280, init: "TP" },
];

function LinkedInIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#0A66C2"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 11.01-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

/**
 * Sign-up surface.
 *
 * Mirrors the sign-in split-panel layout for visual continuity — the
 * differences are the title, the name field, the submit-button copy, and
 * the header link pointing back to `/login`.
 */
export function SignUp({
  onGoogleSignIn,
  onLinkedInSignIn,
  onEmailSignUp,
  onSignIn,
  isPending = false,
  errorMessage,
}: SignUpProps) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[1.05fr_1fr]">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="relative flex flex-col overflow-hidden bg-indigo-50 px-8 py-8 dark:bg-indigo-950/40 md:px-14 lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_500px_at_20%_110%,theme(colors.amber.200/40%),transparent_60%)] dark:bg-[radial-gradient(700px_500px_at_20%_110%,theme(colors.indigo.500/18%),transparent_60%)]"
        />

        <div className="relative">
          <HirelyBrand size="lg" />
        </div>

        <div className="relative my-auto flex max-w-[520px] flex-col gap-7 py-10">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11.5px] text-muted-foreground dark:border-indigo-500/30 dark:bg-indigo-950/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            In private beta &middot; 1,284 hunts in progress
          </div>

          <h1 className="text-4xl font-bold leading-[1.02] tracking-tight md:text-[46px]">
            Apply less.{" "}
            <span className="text-indigo-600 dark:text-indigo-400">
              Interview&nbsp;more.
            </span>
            <br />
            Your inbox does the work.
          </h1>

          <p className="max-w-[470px] text-base leading-relaxed text-foreground/80">
            Hirely connects to Gmail, classifies every recruiter email, and
            auto-applies to roles that fit your résumé.{" "}
            <b className="text-foreground">One click to set up.</b>
          </p>

          <div className="flex items-center gap-3">
            <div className="flex">
              {FACE_PILE.map((p, i) => (
                <div
                  key={p.init}
                  className={cn(
                    "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-indigo-50 text-[11px] font-semibold dark:border-indigo-950",
                    i > 0 && "-ml-2",
                  )}
                  style={{
                    background: `oklch(0.78 0.10 ${p.hue})`,
                    color: `oklch(0.30 0.12 ${p.hue})`,
                  }}
                >
                  {p.init}
                </div>
              ))}
            </div>
            <div className="text-[12.5px] leading-snug text-foreground/80">
              <b className="text-foreground">2,400+ job seekers</b> land
              interviews 1.8&times; faster with Hirely.
            </div>
          </div>
        </div>

        <div className="relative mt-4 text-[11px] text-muted-foreground">
          © Hirely &middot; we never read personal emails
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="relative flex flex-col">
        <header className="flex items-center justify-end gap-1.5 px-6 py-6 text-xs text-muted-foreground md:px-12 md:text-sm">
          Already have an account?
          <button
            type="button"
            onClick={onSignIn}
            className="cursor-pointer font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Sign in
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 md:px-12">
          <div className="w-full max-w-sm">
            <h2 className="text-[28px] font-bold leading-tight tracking-tight md:text-[30px]">
              Create your account
            </h2>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Use the email that owns your job-search inbox — you&apos;ll
              connect Gmail in the next step.
            </p>

            <Button
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={onGoogleSignIn}
              className="mt-5 h-12 w-full justify-center gap-2.5 rounded-full text-[13.5px] font-semibold"
            >
              <GoogleG size={18} />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={onLinkedInSignIn}
              className="mt-2.5 h-12 w-full justify-center gap-2.5 rounded-full text-[13.5px] font-semibold"
            >
              <LinkedInIcon size={18} />
              Continue with LinkedIn
            </Button>

            <p className="mt-2 text-center text-[11.5px] text-muted-foreground/80">
              Google is recommended — Hirely needs Gmail anyway.
            </p>

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
                OR WITH EMAIL
              </span>
              <Separator className="flex-1" />
            </div>

            {errorMessage ? (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <form
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                onEmailSignUp?.({ email, password, name });
              }}
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-name"
                  className="text-[12.5px] font-semibold"
                >
                  Full name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Alex Rivera"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-email"
                  className="text-[12.5px] font-semibold"
                >
                  Email address
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-password"
                  className="text-[12.5px] font-semibold"
                >
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="mt-2 h-12 w-full rounded-full bg-indigo-600 text-[14px] font-semibold shadow-lg shadow-indigo-600/25 hover:bg-indigo-700"
              >
                {isPending ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              By creating an account you agree to our{" "}
              <a className="cursor-pointer underline underline-offset-2 hover:text-foreground">
                Terms
              </a>{" "}
              and{" "}
              <a className="cursor-pointer underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
