<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project conventions

- **Architecture**: MVVM (Views / ViewModels / Models). The full rule lives
  in `.cursor/rules/web-vvm.mdc` at the repo root. Don't fetch in
  components; don't import `@tanstack/react-query` or `authClient` from a
  `components/` file. Use `useReducer` over chained `useState` when state
  has multiple related transitions.
- **Layout**: see `apps/web/README.md` for the full map (`app/` Views,
  `hooks/` ViewModels, `lib/` Models, `components/` Views).
- **Auth**: Better Auth React client (`src/lib/auth-client.ts`). Sessions
  are cookie-based but cross-origin — the API must allow the web origin
  in CORS *and* `trustedOrigins` (driven by `FRONTEND_URL` server-side).
- **State server**: TanStack Query. The `QueryClientProvider` lives in
  `src/app/providers.tsx`; the singleton/per-request split lives in
  `src/lib/query-client.ts` (don't instantiate ad-hoc clients).
- **Styling**: Tailwind v4 + shadcn/ui base-nova. Components in `ui/` are
  shadcn primitives — don't import directly from `@base-ui/react` in app
  code; go through the `ui/` wrappers.
