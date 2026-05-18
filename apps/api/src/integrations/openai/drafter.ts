/**
 * OpenAI-backed draft generator for recruiter replies.
 *
 * Inputs:
 *   - The original message (subject + body + sender) we're replying to.
 *   - The classified stage (drives the kind of reply the user likely
 *     wants -- e.g. for an interview-proposal email we draft a
 *     "thanks, Tuesday 2pm works" response).
 *
 * Output: a plain-text reply body. Subject is derived deterministically
 * outside the LLM ("Re: <original>") so we keep tokens (and cost) on
 * the part the model genuinely contributes.
 *
 * Model choice: gpt-4o-mini for v1. Drafts get reviewed by the user
 * before sending, so we accept the trade-off of slightly less polished
 * prose for ~17x lower cost vs. gpt-4o. Easy to flip the model name
 * later as one constant change.
 *
 * Hard guardrails baked into the prompt:
 *   - Never invent times the user hasn't confirmed. If the recruiter
 *     proposes "Tue 2pm or Wed 11am" we acknowledge availability is
 *     being checked, but DO NOT commit to a specific slot -- that's
 *     what Phase 2C's calendar conflict-check is for.
 *   - Never make claims about the user's experience or qualifications.
 *     Drafts are pure logistics (confirming, asking clarifying
 *     questions, polite scheduling).
 *   - Plain text only. No markdown, no signature, no headers. The user
 *     reviews in Gmail's draft UI and can edit before sending.
 */
import OpenAI from 'openai';

import type { GmailMessageStage } from '../../db/schema/gmail';

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'dummy') {
    throw new Error(
      'OPENAI_API_KEY is required to draft replies (got missing or "dummy")',
    );
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

const SYSTEM_PROMPT = `You write polite, concise replies for a job
seeker responding to a recruiter or hiring manager. Constraints:

  1. Plain text only. No markdown, no bullet lists, no signatures.
  2. Never invent specific meeting times the user hasn't confirmed --
     instead, write "let me check my calendar and confirm shortly" or
     "would either of those slots work for a 30-minute call?"
  3. Never claim the user has skills, experience, education, or
     authorization they haven't proven. Stay in scope: logistics,
     confirmations, clarifying questions, polite thanks.
  4. Sign off "Best," followed by NOTHING -- the user fills their name.
  5. 3-6 sentences. If the original is one line, your reply can be
     one or two lines too. Match the register of the original.
  6. If the original is in a non-English language, reply in the same
     language.

You will receive the original message and a tag describing what stage
of the search the user appears to be in. Use it to bias the response:
   applied      -> warm "thanks for considering me" tone
   phone_screen -> upbeat, offer availability
   interview    -> confirm details, ask any practical questions
   offer        -> thank, then "let me review and respond by <date>"
   rejected     -> brief thanks, leave door open for future roles
   ghosted      -> a short polite nudge`;

export interface DraftReplyInput {
  /** Original sender's display name + address (e.g. "Jane Doe <jane@acme.com>"). */
  originalFrom: string;
  /** Subject line of the original message. */
  originalSubject: string;
  /** Body text of the original message (truncated to ~4 KB upstream). */
  originalBody: string;
  /** Classifier's stage label. */
  stage: GmailMessageStage;
}

export interface DraftReplyResult {
  /** Plain-text reply body, ready for the Drafts folder. */
  bodyPlain: string;
}

export async function draftReply(
  input: DraftReplyInput,
): Promise<DraftReplyResult> {
  const client = getClient();

  const userContent = [
    `Stage: ${input.stage}`,
    '',
    `From: ${input.originalFrom}`,
    `Subject: ${input.originalSubject}`,
    '',
    input.originalBody.slice(0, 4000),
  ].join('\n');

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4, // a touch of warmth without inviting hallucination
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });

  const bodyPlain = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!bodyPlain) {
    throw new Error('OpenAI returned an empty draft body');
  }

  return { bodyPlain };
}
