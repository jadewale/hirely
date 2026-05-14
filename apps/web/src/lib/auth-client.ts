/**
 * Better Auth React client.
 *
 * This is the only place we instantiate `createAuthClient`. Components and
 * hooks should import `authClient` (or the re-exported `useSession`,
 * `signIn`, etc.) from here so the singleton is shared across the app and
 * its internal session cache stays consistent.
 *
 * The base URL points at the Hirely API host — Better Auth's client tacks
 * on `/api/auth/...` itself when it makes requests. Cross-origin cookies
 * are enabled server-side via `enableCors({ credentials: true })` in
 * `apps/api/src/bootstrap.ts`; the client uses `credentials: 'include'` by
 * default (via better-fetch).
 */
import { createAuthClient } from "better-auth/react";

import { API_URL } from "./env";

export const authClient = createAuthClient({
  baseURL: API_URL,
});

export const { useSession, signIn, signUp, signOut, getSession } = authClient;

export type Session = ReturnType<typeof authClient.useSession>["data"];
