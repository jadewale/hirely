import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

// Body / UI. Inter is what globals.css reads via --font-sans (and what the
// `font-sans` Tailwind utility resolves to).
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Code / numerals. globals.css wires --font-mono -> --font-geist-mono, so we
// keep that variable name even though we're using JetBrains Mono.
const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hirely",
  description:
    "Your inbox is already tracking your job hunt. Now it can act on it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` sets `class="dark"` on <html> before React hydrates;
      // suppressing the warning prevents the mismatch error in dev.
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
