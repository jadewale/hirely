/**
 * TanStack Query client factory.
 *
 * Next.js hydrates twice (server render → client mount), so each request on
 * the server needs its own QueryClient while the browser must hand one out
 * exactly once per app lifecycle. The pattern below — a fresh client per
 * server render, a memoized client on the browser — comes straight from the
 * TanStack Next.js guide.
 */
import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Mutations carry their own staleness rules; queries default to 30s
        // so a quick remount (e.g. tab switch) doesn't always re-fetch.
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
