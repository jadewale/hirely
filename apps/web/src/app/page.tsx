import { redirect } from "next/navigation";

/**
 * Root entry point.
 *
 * The marketing site lives elsewhere; landing on `app.hirely.com/` (or
 * `localhost:3000/`) should drop straight into the onboarding orchestrator.
 * `/onboarding` itself short-circuits to the next step if a session already
 * exists, so this redirect works for both new and returning users.
 */
export default function RootPage(): never {
  redirect("/onboarding");
}
