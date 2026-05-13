import { inngest } from '../client';

// Smoke-test function. Trigger it with:
//   curl -X POST http://localhost:8288/e/dev \
//     -H 'content-type: application/json' \
//     -d '{"name":"demo/hello.world","data":{"name":"world"}}'
// or via the Inngest dev UI at http://localhost:8288.
export const helloWorld = inngest.createFunction(
  {
    id: 'hello-world',
    triggers: [{ event: 'demo/hello.world' }],
  },
  async ({ event, step }) => {
    const greeting = await step.run('build-greeting', () => {
      const name = (event.data as { name?: string })?.name ?? 'world';
      return `hello, ${name}`;
    });

    return { greeting, receivedAt: new Date().toISOString() };
  },
);
