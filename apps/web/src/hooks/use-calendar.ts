"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { API_URL } from "@/lib/env";

export interface BusyWindow {
  start: string;
  end: string;
}

export interface FreeBusyResponse {
  busy: BusyWindow[];
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  start: string;
  end: string;
  timeZone?: string;
  attendees: string[];
  withMeet?: boolean;
}

export interface CreatedEvent {
  id: string;
  hangoutLink: string | null;
  htmlLink: string | null;
}

export const FREE_BUSY_QUERY_KEY = (from: string, to: string, tz?: string) =>
  ["calendar", "free-busy", from, to, tz ?? "UTC"] as const;

/**
 * Reads the user's primary calendar busy windows for a given range.
 *
 * Backed by GET /api/calendar/free-busy. Range is capped at 30 days
 * server-side. Used by the per-thread "check my availability" UI to
 * grey out conflicting slots when the user picks an interview time.
 */
export function useFreeBusy(opts: {
  from: string;
  to: string;
  tz?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: FREE_BUSY_QUERY_KEY(opts.from, opts.to, opts.tz),
    enabled: opts.enabled ?? true,
    queryFn: async (): Promise<FreeBusyResponse> => {
      const params = new URLSearchParams({
        from: opts.from,
        to: opts.to,
      });
      if (opts.tz) params.set("tz", opts.tz);
      const res = await fetch(
        `${API_URL}/api/calendar/free-busy?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error(`Free/busy fetch failed (${res.status})`);
      }
      return (await res.json()) as FreeBusyResponse;
    },
    staleTime: 30_000,
  });
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: async (input: CreateEventInput): Promise<CreatedEvent> => {
      const res = await fetch(`${API_URL}/api/calendar/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Event creation failed (${res.status}): ${body}`);
      }
      return (await res.json()) as CreatedEvent;
    },
  });
}
