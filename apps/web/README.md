# `apps/web`

Next.js 16 (App Router, Turbopack) client for Hirely. Uses shadcn/ui
(base-nova) with Tailwind v4 for design, TanStack Query for server state,
and Better Auth's React client for sessions.

## Quickstart

```bash
cp .env.example .env.local       # set NEXT_PUBLIC_API_URL
bun install                      # from the repo root
bun --cwd apps/web run dev       # starts on http://localhost:3000
```

The API must also be running locally (`apps/api`, port 4000). Both are
needed: the web client makes cross-origin `credentials: 'include'` calls to
`/api/auth/*`, and the API's CORS allowlist is driven by `FRONTEND_URL`.

## Routes

| Route          | What it is                                                   |
| -------------- | ------------------------------------------------------------ |
| `/`            | Server redirect to `/onboarding`                             |
| `/onboarding`  | New-user orchestrator: sign-in/up → Gmail connect → scan → reveal |
| `/login`       | Returning-user sign-in. Bounces to `/dashboard` on success.  |
| `/sign-up`     | Account creation. Bounces to `/onboarding` on success.       |
| `/dashboard`   | Authenticated landing surface (smoke test for the auth loop) |

## Layout

```
src/
├── app/
│   ├── layout.tsx              # root layout, wraps in <Providers>
│   ├── providers.tsx           # ThemeProvider + QueryClientProvider + Toaster
│   ├── page.tsx                # redirect → /onboarding
│   ├── login/page.tsx          # Views: thin shells over a VM hook
│   ├── sign-up/page.tsx
│   ├── onboarding/page.tsx
│   └── dashboard/page.tsx
├── components/
│   ├── ui/                     # shadcn primitives (button, card, alert, progress, …)
│   ├── onboarding/             # SignIn, GmailConnect, Scanning, FirstReveal (Views)
│   └── dashboard/              # DashboardView (View)
├── hooks/
│   ├── use-auth-mutations.ts   # shared Better Auth mutations (model-layer hook)
│   ├── use-onboarding-vm.ts    # ViewModel for /onboarding (useReducer step machine)
│   ├── use-login-vm.ts         # ViewModel for /login
│   ├── use-sign-up-vm.ts       # ViewModel for /sign-up
│   └── use-dashboard-vm.ts     # ViewModel for /dashboard
└── lib/
    ├── env.ts                  # NEXT_PUBLIC_API_URL
    ├── auth-client.ts          # Better Auth React client singleton
    ├── query-client.ts         # TanStack Query (server/client split)
    ├── utils.ts                # cn() helper
    └── onboarding-data.ts      # mock data for the onboarding canvas
```

## Architecture (MVVM)

See `.cursor/rules/web-vvm.mdc` for the full rule. Short version:

- **Models** (`lib/`) — pure types + API clients (Better Auth, env). No React.
- **ViewModels** (`hooks/`) — own state (use `useReducer` when state has
  multiple transitions), side effects (queries, mutations), and routing
  decisions. No JSX.
- **Views** (`components/`, `app/**/page.tsx`) — render JSX from props. No
  `useQuery` / `useMutation` / direct `fetch`. Local form/UI state is fine.

A page wires the VM to the View:

```tsx
"use client";
export default function LoginPage() {
  const vm = useLoginVm();
  return <SignIn mode="sign-in" {...vm} ... />;
}
```

## Env

Single client-side var, inlined at build time:

| Var                  | Default                  | Purpose                                |
| -------------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_API_URL`| `http://localhost:4000`  | Base URL of the Hirely API (no `/api`) |

## Deploy (Vercel)

The web client is hosted on **Vercel** (the API stays on AWS — see
`packages/terraform-aws/`). The split is intentional: Vercel runs the
static-shell Next.js SPA on its edge CDN; AWS runs the long-lived API +
Postgres + Inngest workers.

### One-time setup

```bash
# 1. Install + login to Vercel CLI (interactive — opens browser)
bun add -g vercel
vercel login

# 2. Link this directory to a Vercel project (run from apps/web/)
cd apps/web
vercel link

# 3. Set the single env var the client needs
vercel env add NEXT_PUBLIC_API_URL production
#   value: https://api.mindoutreach.com
vercel env add NEXT_PUBLIC_API_URL preview
#   value: https://api.mindoutreach.com   (or a staging API once we have one)

# 4. Trigger the first prod deploy
vercel --prod
```

### Custom domain

Terraform already creates the Route53 CNAME for `app.mindoutreach.com`
(see `packages/terraform-aws/web_dns.tf`). To complete the hookup:

1. In the Vercel dashboard → Project → Settings → Domains, add
   `app.mindoutreach.com`. Vercel will tell you which CNAME target to
   use; if it gives you something other than `cname.vercel-dns.com`,
   update `vercel_dns_target` in `packages/terraform-aws/terraform.tfvars`
   and re-apply.
2. Wait 1-3 minutes for DNS propagation. Vercel auto-issues a Let's
   Encrypt cert; nothing else to do.

### Cross-origin auth

The web client talks to `api.mindoutreach.com` with
`credentials: 'include'`. Three places must list the web origin:

1. **API CORS / Better Auth `trustedOrigins`** — `FRONTEND_URL` env var
   on the ECS task (driven by `var.frontend_url` in
   `packages/terraform-aws/terraform.tfvars`). Comma-separated.
2. **Google OAuth client** (in Google Cloud Console, project
   `hirely-495121`):
   - `redirect_uris` must include
     `https://api.mindoutreach.com/api/auth/callback/google`. The
     callback always lands on the API host, never on the web host.
   - `javascript_origins` must include `https://app.mindoutreach.com`
     (the page that initiates the OAuth flow).
3. **Vercel env** — `NEXT_PUBLIC_API_URL` (above). Points the Better
   Auth React client at the production API.

### Bumping the API after a frontend_url change

`FRONTEND_URL` is injected by the CodeBuild "Deploy" project (see
`cicd.tf` line ~270). After `terraform apply`, you need to trigger a new
pipeline run for the running ECS task to pick up the new value:

```bash
aws codepipeline start-pipeline-execution --name hirely-prod-api
```

Or push any commit to `main` — the GitHub source action will kick the
pipeline automatically.

## What's still TODO in the onboarding flow

- **Gmail OAuth scope-request** on the Connect step. The "Authorize" button
  currently advances straight to the scanning screen so the canvas plays
  end-to-end; replace with the real Google OAuth flow when the
  integrations feature ships.
- **Real inbox-scan subscription** on the Scanning step. The 3.5s
  `setTimeout` in `useOnboardingVm` is a placeholder; swap in an Inngest
  function status poll or SSE stream once the scan job exists.
- **Forgot-password page.** `/login?forgot=1` is just a no-op breadcrumb
  for now.
- **`completed_onboarding` flag** on the user, so returning users skip
  steps 2-4 of `/onboarding` instead of re-running the wizard.
