import { z } from 'zod';
import { assistantStatusSchema } from './enums';
import { idSchema } from './common';

/**
 * Assistant profile contracts (RR-010) — the request/response shapes shared by
 * career-api and career-web. Pure transport: no ORM detail leaks through.
 */

// Field-level building blocks. Strings are trimmed so " " doesn't pass a
// non-empty check and stored values have no incidental whitespace.
const displayName = z.string().trim().min(1).max(120);
const headline = z.string().trim().max(160);
const bio = z.string().trim().max(4000);
// IANA timezone name, e.g. "America/New_York". Length-bounded, not enumerated.
const timezone = z.string().trim().min(1).max(64);
// Money as integer minor units (cents). Capped at a sane $100k/hr upper bound.
const hourlyRateCents = z.number().int().min(0).max(10_000_000);

/**
 * Body for `PUT /api/assistant/profile` (create-or-replace of the caller's own
 * profile). `displayName` is required; every other field is optional and may be
 * sent as `null` to clear it. `.strict()` rejects unknown keys — notably
 * `status`, which is admin-owned and never settable through this path.
 */
export const upsertAssistantProfileSchema = z
  .object({
    displayName,
    headline: headline.nullish(),
    bio: bio.nullish(),
    timezone: timezone.nullish(),
    hourlyRateCents: hourlyRateCents.nullish(),
  })
  .strict();
export type UpsertAssistantProfileInput = z.infer<
  typeof upsertAssistantProfileSchema
>;

/** Body for `PATCH /api/admin/assistants/:userId/status` (admin-only). */
export const updateAssistantStatusSchema = z
  .object({ status: assistantStatusSchema })
  .strict();
export type UpdateAssistantStatusInput = z.infer<
  typeof updateAssistantStatusSchema
>;

/** Response shape for a single assistant profile. Timestamps are ISO strings. */
export const assistantProfileSchema = z.object({
  id: idSchema,
  userId: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  timezone: z.string().nullable(),
  hourlyRateCents: z.number().int().nullable(),
  status: assistantStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AssistantProfile = z.infer<typeof assistantProfileSchema>;
