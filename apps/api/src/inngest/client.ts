import { Inngest } from 'inngest';

// Single Inngest client for the API. The `id` shows up in the Inngest UI and
// uniquely identifies this app within the Inngest workspace.
//
// Events are typed at the trigger / send site via the `eventType()` carriers
// in `./events.ts` (v4 API). Don't add a `schemas` option here — that was
// the v3 EventSchemas pattern and no longer exists.
//
// Auth keys are read from env automatically by the SDK:
//   - INNGEST_EVENT_KEY    (events: server -> Inngest)
//   - INNGEST_SIGNING_KEY  (webhooks: Inngest -> serve() handler)
// Both are optional locally — the Inngest dev server runs keyless.
export const inngest = new Inngest({
  id: 'hirely-api',
});
