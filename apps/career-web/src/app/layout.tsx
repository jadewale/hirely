import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Career Platform",
  description: "A reverse-recruiting marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white text-neutral-900">{children}</body>
    </html>
  );
}
