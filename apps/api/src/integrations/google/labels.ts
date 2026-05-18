/**
 * Maps Hirely pipeline stages to user-visible Gmail label names, and
 * provides an idempotent "make sure this label exists" helper.
 *
 * Gmail labels are user-scoped. The first time we apply a label for a
 * given user we have to either find an existing label with that name
 * OR create one. Subsequent applies are pure cache hits. The
 * `gmail_label` table is that cache.
 *
 * Why not just hard-code label IDs? Gmail's label IDs are per-user
 * (e.g. user A's "Hirely / Interview" might be Label_193 and user B's
 * might be Label_4421). We always have to look them up.
 */
import { and, eq } from 'drizzle-orm';

import { db } from '../../db';
import { gmailLabel, type GmailMessageStage } from '../../db/schema';
import { createLabel, listLabels } from './gmail.client';

/**
 * Hirely's stage labels live under a single parent so the user's Gmail
 * label list stays organized. Gmail renders "Hirely / Interview" as
 * a nested label under "Hirely" automatically -- we don't have to
 * create the parent separately.
 *
 * `unrelated` is excluded from this map: we never label messages
 * classified as unrelated. They're stored in gmail_message for
 * audit/debug purposes (so a misclassification can be inspected later)
 * but the user never sees them surfaced in either Gmail or the
 * pipeline.
 */
export const STAGE_LABEL_NAMES: Partial<Record<GmailMessageStage, string>> = {
  applied: 'Hirely / Applied',
  phone_screen: 'Hirely / Phone screen',
  interview: 'Hirely / Interview',
  offer: 'Hirely / Offer',
  rejected: 'Hirely / Rejected',
  ghosted: 'Hirely / Ghosted',
};

export function isLabelableStage(stage: GmailMessageStage): boolean {
  return stage in STAGE_LABEL_NAMES;
}

/**
 * Returns the Gmail label ID for the given user/stage, creating the
 * label in the user's Gmail account if it doesn't exist yet. Idempotent
 * and safe to call concurrently for the same (user, stage) -- the
 * underlying table has a UNIQUE index that turns a race into a no-op
 * UPDATE.
 *
 * Sequence:
 *   1. DB cache hit -> return cached id.
 *   2. DB cache miss -> list Gmail labels.
 *      a. Existing match by name -> cache it, return id.
 *      b. No match -> create label, cache id, return.
 *
 * The list-then-create flow handles two awkward cases:
 *   - User manually created a "Hirely / Interview" label before
 *     connecting Hirely. We adopt it instead of creating a duplicate.
 *   - We previously created the label, lost cache (e.g. db rolled back)
 *     and would otherwise 409 on re-create.
 */
export async function ensureLabel(opts: {
  accessToken: string;
  userId: string;
  stage: GmailMessageStage;
}): Promise<string | null> {
  const name = STAGE_LABEL_NAMES[opts.stage];
  if (!name) return null;

  // 1. DB cache lookup
  const cached = await db
    .select({ id: gmailLabel.gmailLabelId })
    .from(gmailLabel)
    .where(
      and(eq(gmailLabel.userId, opts.userId), eq(gmailLabel.stage, opts.stage)),
    )
    .limit(1);
  if (cached[0]) return cached[0].id;

  // 2. Cache miss -> reconcile with Gmail
  const labels = await listLabels(opts.accessToken);
  const existing = labels.find((l) => l.name === name);
  let gmailLabelId: string;
  if (existing) {
    gmailLabelId = existing.id;
  } else {
    const created = await createLabel(opts.accessToken, name);
    gmailLabelId = created.id;
  }

  // 3. Persist. ON CONFLICT DO NOTHING in case two concurrent paths
  // raced -- second insert is a no-op and we still return the id we
  // just resolved. The unique index makes the race safe.
  await db
    .insert(gmailLabel)
    .values({
      id: `lbl_${opts.userId}_${opts.stage}`,
      userId: opts.userId,
      stage: opts.stage,
      gmailLabelId,
      name,
    })
    .onConflictDoNothing({
      target: [gmailLabel.userId, gmailLabel.stage],
    });

  return gmailLabelId;
}
