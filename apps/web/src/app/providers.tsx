"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { getQueryClient } from "@/lib/query-client";

/**
 * Root client-side providers.
 *
 * Lives in its own `'use client'` file so the root layout can stay a Server
 * Component while still mounting QueryClient, the theme provider, and a
 * global toaster. Anything that needs React context (mutations, session
 * hook, theme switcher, toasts) should be wrapped by this tree.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // `getQueryClient` returns a fresh client on the server and the same
  // singleton on the browser — see `lib/query-client.ts` for the rationale.
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 5000 }}
        />
        {process.env.NODE_ENV === "development" ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
