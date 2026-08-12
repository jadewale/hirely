/**
 * Better Auth React client — the single place career-web instantiates it, so
 * the session cache is shared. The base URL is the career-api host; Better
 * Auth appends `/api/auth/...` itself. Cross-origin cookies work because the
 * API sets CORS `credentials: true` and better-fetch sends `credentials:
 * 'include'`.
 */
import { createAuthClient } from 'better-auth/react';
import { API_URL } from './env';

export const authClient = createAuthClient({ baseURL: API_URL });

export const { useSession, signIn, signUp, signOut } = authClient;
