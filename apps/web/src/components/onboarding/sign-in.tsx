"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HirelyBrand, GoogleG, OnboardingBackdrop } from "./_shared";
import { cn } from "@/lib/utils";

export type AuthMode = "sign-in" | "sign-up";

export interface SignInProps {
  /** Switches copy + adds a name field when set to "sign-up". */
  mode?: AuthMode;
  /** Called when the user clicks "Continue with Google" — the main CTA. */
  onGoogleSignIn?: () => void;
  /**
   * Called when the user submits the email form. `name` is only present in
   * sign-up mode (and may be the empty string if the user leaves it blank).
   */
  onEmailSubmit?: (input: {
    email: string;
    password: string;
    name: string;
  }) => void;
  /** Click handler for the secondary link in the header (toggle mode). */
  onSwitchMode?: () => void;
  /** Click handler for the "Forgot?" link (sign-in mode only). */
  onForgotPassword?: () => void;
  /** Disables the form + spins the submit buttons while a request is in flight. */
  isPending?: boolean;
  /** Renders a destructive alert above the form when set. */
  errorMessage?: string | null;
  /** Pre-fill the email field (e.g. when bouncing between sign-in/sign-up). */
  defaultEmail?: string;
}

/**
 * Sign-in / sign-up surface.
 *
 * Same design across both modes — only the title, the submit-button label,
 * the header link, and the presence of the name field change. Keeping it in
 * one component avoids drift between two near-identical screens.
 */
export function SignIn({
  mode = "sign-in",
  onGoogleSignIn,
  onEmailSubmit,
  onSwitchMode,
  onForgotPassword,
  isPending = false,
  errorMessage,
  defaultEmail = "",
}: SignInProps) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const isSignUp = mode === "sign-up";

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative flex items-center justify-between px-6 py-5 md:px-9">
        <HirelyBrand size="lg" />
        <div className="text-xs text-muted-foreground md:text-sm">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchMode}
                className="cursor-pointer font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                type="button"
                onClick={onSwitchMode}
                className="cursor-pointer font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      <div className="relative grid grid-cols-1 lg:grid-cols-2 lg:min-h-[calc(100vh-76px)]">
        {/* Left — story */}
        <div className="flex flex-col justify-center px-6 py-10 md:px-12 lg:px-16">
          <div className="inline-flex items-center gap-1.5 self-start rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Now in private beta &middot; 1,284 hunts in progress
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-[1.05] tracking-tight md:text-4xl lg:text-[44px]">
            Your inbox is already <br className="hidden md:inline" />
            tracking your job hunt. <br />
            <span className="text-indigo-600 dark:text-indigo-400">
              Now it can act on it.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Connect Gmail once. Hirely classifies every recruiter email, keeps
            a live pipeline, drafts replies in your voice, and auto-applies to
            roles that fit.
          </p>

          <div className="mt-6 flex items-center gap-3.5">
            <div className="flex">
              {[
                { h: "140", i: "JK" },
                { h: "220", i: "MR" },
                { h: "30", i: "AN" },
                { h: "280", i: "TP" },
              ].map((p, i) => (
                <div
                  key={p.i}
                  className={cn(
                    "flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-background text-[11px] font-semibold",
                    i > 0 && "-ml-2",
                  )}
                  style={{
                    background: `oklch(0.78 0.10 ${p.h})`,
                    color: `oklch(0.30 0.12 ${p.h})`,
                  }}
                >
                  {p.i}
                </div>
              ))}
            </div>
            <div className="text-xs leading-tight text-muted-foreground">
              <b className="text-foreground">2,400+ job seekers</b> use Hirely
              <br />
              to land interviews 1.8&times; faster
            </div>
          </div>
        </div>

        {/* Right — sign-in / sign-up card */}
        <div className="flex items-center justify-center px-6 pb-10 md:px-12 lg:px-16">
          <Card className="w-full max-w-sm p-8 shadow-2xl shadow-foreground/5">
            <h2 className="text-xl font-bold tracking-tight">
              {isSignUp ? "Create your account" : "Sign in"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSignUp
                ? "Use the account that owns your job-search inbox \u2014 you'll connect Gmail in the next step."
                : "Welcome back. Use the account that owns your job-search inbox."}
            </p>

            {/* Google — primary */}
            <Button
              size="lg"
              disabled={isPending}
              className="mt-6 w-full gap-2.5 bg-foreground text-background hover:bg-foreground/90"
              onClick={onGoogleSignIn}
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white">
                <GoogleG size={14} />
              </span>
              Continue with Google
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Recommended &mdash; Hirely needs Gmail anyway
            </p>

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
                OR
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
                onEmailSubmit?.({ email, password, name });
              }}
            >
              {isSignUp ? (
                <div className="space-y-1.5">
                  <Label htmlFor="signin-name" className="text-[11.5px]">
                    Full name
                  </Label>
                  <Input
                    id="signin-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Alex Rivera"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="signin-email" className="text-[11.5px]">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-[11.5px]">
                    Password
                  </Label>
                  {!isSignUp ? (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="cursor-pointer text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Forgot?
                    </button>
                  ) : null}
                </div>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    isSignUp ? "new-password" : "current-password"
                  }
                  minLength={isSignUp ? 8 : undefined}
                  required
                  placeholder={
                    isSignUp ? "At least 8 characters" : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  }
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                disabled={isPending}
                className="w-full"
              >
                {isPending
                  ? isSignUp
                    ? "Creating account\u2026"
                    : "Signing in\u2026"
                  : isSignUp
                    ? "Create account"
                    : "Sign in with email"}
              </Button>
            </form>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              By {isSignUp ? "creating an account" : "signing in"} you agree to
              our{" "}
              <a className="cursor-pointer underline underline-offset-2 hover:text-foreground">
                Terms
              </a>{" "}
              and{" "}
              <a className="cursor-pointer underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
