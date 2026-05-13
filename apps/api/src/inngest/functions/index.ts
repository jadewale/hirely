// Registry of every Inngest function the API serves.
// Add new functions here so the serve() handler picks them up automatically.

import { helloWorld } from './hello-world';

export const functions = [helloWorld];
