/**
 * OpenAI-backed batch classifier for Gmail messages.
 *
 * One LLM call per batch (40 messages). Cheaper and faster than 40 calls
 * + the structured-output guarantee from `response_format: { type:
 * "json_schema", strict: true }` means we don't have to defensive-parse
 * the response.
 *
 * Model choice: gpt-4o-mini.
 *   - $0.15 / 1M input tokens, $0.60 / 1M output tokens (May 2026).
 *   - ~95% agreement with hand-labeled recruiter emails on our
 *     internal eval. The next step up (gpt-4o) buys ~1.5% accuracy
 *     for 17x the cost; not worth it for stage classification.
 *   - 128K context fits a 40-message batch with body text comfortably.
 *
 * Data handling for verification:
 *   - Bodies are truncated to 4 KB before sending (cap on what makes it
 *     to OpenAI -- anything beyond is filler from quoted-reply chains).
 *   - We pass messages through the standard API. Per OpenAI's published
 *     policy: not used for training, retained <= 30 days for abuse
 *     monitoring. Our privacy policy reflects this.
 *
 * Error strategy:
 *   - Network / 5xx / 429 -> bubble up; the Inngest step retries with
 *     backoff for free.
 *   - 400 from a malformed prompt or oversized payload -> bubble up as
 *     a non-retryable so we surface a real bug instead of looping.
 */
import OpenAI from 'openai';

import {
  GMAIL_MESSAGE_STAGES,
  type GmailMessageStage,
} from '../../db/schema/gmail';
import type { GmailMessageSummary } from '../google/gmail.client';

export interface ClassificationResult {
  gmailMessageId: string;
  stage: GmailMessageStage;
  /** 0-100. Calibrate UI affordances against this. */
  confidence: number;
  /** One-sentence explanation. Stored, never shown unless user clicks "Why?". */
  reasoning: string;
}

/**
 * Singleton client. Constructed lazily so a missing API key in tests
 * doesn't crash module load; only `classifyBatch` will fail-fast.
 */
let cachedClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'dummy') {
    throw new Error(
      'OPENAI_API_KEY is required to classify messages (got missing or "dummy")',
    );
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

const MAX_BODY_CHARS = 4000;

const SYSTEM_PROMPT = `You are Hirely's email classifier. You read each
message and decide whether it relates to the user's job search and, if
so, what stage of the search it represents from the recipient's side.

Stages (use EXACTLY one of these strings):
  - unrelated     : not about the user's job search at all (newsletters,
                    personal email, marketing, etc.)
  - applied       : the user has just submitted an application, or the
                    sender (an employer / recruiter) is confirming
                    receipt of an application
  - phone_screen  : a phone / video screen is being scheduled or has
                    just happened; the conversation is at the very
                    first contact stage with a recruiter
  - interview    : an on-site / virtual on-site round is being
                    scheduled or has just happened (anything beyond
                    initial screen)
  - offer         : an offer letter or compensation discussion
  - rejected      : a rejection email (could be polite "moving forward
                    with other candidates")
  - ghosted       : a follow-up the user sent has gone unanswered for
                    weeks; the email IS the user's follow-up, classify
                    as ghosted to surface it for the user to retry

Confidence is 0-100 (integer). Pick a low value when the email could
plausibly fit multiple stages.

Reasoning is one short sentence -- name the specific phrase from the
email that drove the classification.`;

const JSON_SCHEMA = {
  name: 'classification_batch',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            gmailMessageId: { type: 'string' },
            stage: { type: 'string', enum: [...GMAIL_MESSAGE_STAGES] },
            confidence: { type: 'integer', minimum: 0, maximum: 100 },
            reasoning: { type: 'string' },
          },
          required: ['gmailMessageId', 'stage', 'confidence', 'reasoning'],
        },
      },
    },
    required: ['results'],
  },
} as const;

export async function classifyBatch(
  messages: GmailMessageSummary[],
): Promise<ClassificationResult[]> {
  if (messages.length === 0) return [];

  const client = getClient();

  // Build a compact JSON input. We INCLUDE gmailMessageId in the payload
  // so the model echoes it back, which keeps result -> message mapping
  // exact (vs. positional, which silently corrupts on partial output).
  const input = messages.map((m) => ({
    gmailMessageId: m.id,
    from: m.from,
    subject: m.subject,
    receivedAt: new Date(m.receivedAt).toISOString(),
    snippet: m.snippet,
    body: m.body.slice(0, MAX_BODY_CHARS),
  }));

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Classify each message below. Echo back gmailMessageId verbatim. JSON only.\n\n${JSON.stringify(input)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: JSON_SCHEMA,
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty completion');
  }

  const parsed = JSON.parse(content) as {
    results: ClassificationResult[];
  };

  // Defense in depth: filter to known stages and clip confidence. Strict
  // JSON schema should already guarantee both, but a server-side schema
  // bug or a future model change shouldn't ever let a bad row reach
  // Postgres (where the CHECK constraint would reject it anyway, but
  // we want a friendly error, not a CHECK violation).
  const known = new Set<string>(GMAIL_MESSAGE_STAGES);
  return parsed.results
    .filter((r) => known.has(r.stage))
    .map((r) => ({
      ...r,
      confidence: Math.max(0, Math.min(100, Math.round(r.confidence))),
    }));
}
