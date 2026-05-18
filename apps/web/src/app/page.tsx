import type { Metadata } from "next";
import Link from "next/link";

import { HirelyBrand, OnboardingBackdrop } from "@/components/onboarding/_shared";
import { buttonVariants } from "@/components/ui/button";

/**
 * Public landing page at `/`.
 *
 * This used to redirect straight to `/onboarding`. Google's OAuth
 * verification (specifically for restricted Gmail scopes) requires that
 * the home page URL listed on the OAuth consent screen renders a public
 * HTML page that:
 *   1. Links to the Privacy Policy, and
 *   2. Is registered to the verified-owner of the GCP project (handled
 *      separately via Search Console DNS verification).
 *
 * A 307 redirect to `/onboarding` failed both implicit checks because
 * Google's crawler hit the post-redirect HTML, which doesn't include a
 * footer with /privacy and /terms.
 *
 * Rendering as a Server Component (no client hooks). Crawlers do not
 * execute JS, so anything they need (especially the privacy link) must
 * be in the initial HTML payload.
 *
 * No auth-aware redirect for returning users yet -- adding that would
 * require server-side session lookup on every landing hit. Returning
 * users get one extra click ("Sign in" top-right) until we move the
 * auth-aware redirect into a thin client wrapper.
 */
export const metadata: Metadata = {
  title: "Hirely — Land your next role faster",
  description:
    "Hirely watches your inbox for recruiter emails, classifies them by stage, drafts replies in your voice, and books interviews on your calendar.",
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <OnboardingBackdrop />

      <header className="relative z-10 border-b border-border/40 bg-background/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex">
            <HirelyBrand size="md" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={`${buttonVariants({ variant: "ghost", size: "sm" })} cursor-pointer`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={`${buttonVariants({ size: "sm" })} cursor-pointer`}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Built for active job seekers
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              Land your next role faster.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Hirely watches your inbox for recruiter emails, classifies them
              by stage, drafts replies in your voice, and books interviews on
              your calendar &mdash; so you can focus on the conversations
              that matter.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className={`${buttonVariants({ size: "lg" })} w-full cursor-pointer sm:w-auto`}
              >
                Get started &mdash; free
              </Link>
              <Link
                href="/login"
                className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full cursor-pointer sm:w-auto`}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-[11.5px] text-muted-foreground">
              By continuing you agree to our{" "}
              <Link
                href="/terms"
                className="cursor-pointer underline underline-offset-2 hover:text-foreground"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="cursor-pointer underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 md:grid-cols-3">
            <FeatureCard
              title="Inbox triage"
              body="Read-only Gmail access classifies every recruiter email by stage so your pipeline stays current without you lifting a finger."
            />
            <FeatureCard
              title="Conflict-aware scheduling"
              body="Reads your Calendar in the relevant window to spot conflicts before you accept an interview, and adds confirmed slots to your primary calendar."
            />
            <FeatureCard
              title="Drafts in your voice"
              body="Replies are written into your Gmail Drafts folder for review. Hirely never sends a message without your explicit click."
            />
          </div>
          <p className="mt-8 text-center text-[12px] text-muted-foreground">
            Hirely&rsquo;s use of information from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. See our{" "}
            <Link
              href="/privacy"
              className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </Link>{" "}
            for the full breakdown of what data is accessed, why, and how
            long it&rsquo;s kept.
          </p>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 bg-background/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <HirelyBrand size="md" />
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy"
              className="cursor-pointer hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="cursor-pointer hover:text-foreground"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:support@mindoutreach.com"
              className="cursor-pointer hover:text-foreground"
            >
              Contact
            </a>
            <span>&copy; Hirely. All rights reserved.</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card/60 p-6 backdrop-blur">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
