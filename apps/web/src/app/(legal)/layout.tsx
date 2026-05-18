import Link from "next/link";

import { HirelyBrand } from "@/components/onboarding/_shared";

/**
 * Shared chrome for /privacy and /terms.
 *
 * Static rendering, no auth — these pages have to load anonymously
 * because Google's OAuth consent screen links to them externally and a
 * 401 there would block our app verification.
 *
 * Kept intentionally plain: same typography conventions as the rest of
 * the app, no Tailwind typography plugin, no Markdown loader. The pages
 * are small enough that hand-styled JSX is easier to keep accurate
 * against legal review than a Markdown-rendered alternative.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex">
            <HirelyBrand size="md" />
          </Link>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground md:text-sm">
            <Link
              href="/privacy"
              className="cursor-pointer hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="cursor-pointer hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/onboarding"
              className="cursor-pointer text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Go to app &rarr;
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-2 px-6 py-6 text-[11.5px] text-muted-foreground md:flex-row md:items-center">
          <div>&copy; Hirely. All rights reserved.</div>
          <div>
            Questions? Email{" "}
            <a
              href="mailto:privacy@mindoutreach.com"
              className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            >
              privacy@mindoutreach.com
            </a>
            .
          </div>
        </div>
      </footer>
    </div>
  );
}
