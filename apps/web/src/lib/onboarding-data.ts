// Sample data used by the onboarding screens. Lift these into your real
// data layer when ready (server actions, API, etc).

export type AiActionKind = "applied" | "replied" | "classified" | "flagged";

export const ONBOARDING_USER = {
  name: "Alex Rivera",
  email: "alex.rivera@gmail.com",
  initials: "AR",
};

export const SCAN_PROGRESS = {
  total: 1284,
  scanned: 947,
  etaSeconds: 22,
};

export const FOUND_STAGES = [
  { name: "Applied", count: 14, tone: "primary" as const },
  { name: "Phone screen", count: 4, tone: "amber" as const },
  { name: "Interview", count: 2, tone: "amber" as const },
  { name: "Offer", count: 1, tone: "emerald" as const },
  { name: "Rejected", count: 2, tone: "rose" as const },
];

export const LIVE_TRACE: Array<{
  t: string;
  co: string;
  stage: string;
  tone: "primary" | "amber" | "emerald" | "rose";
}> = [
  { t: "0:38", co: "Stripe", stage: "\u2192 Interview", tone: "amber" },
  { t: "0:38", co: "Ramp", stage: "\u2192 Offer", tone: "emerald" },
  { t: "0:37", co: "Airbnb", stage: "\u2192 Rejected", tone: "rose" },
  { t: "0:37", co: "Linear", stage: "\u2192 Applied", tone: "primary" },
  { t: "0:36", co: "Plaid", stage: "\u2192 Phone screen", tone: "amber" },
];

export const FIRST_REVEAL_STATS = [
  { label: "Total applications", value: "23", hint: "last 12 months" },
  { label: "Active", value: "18", hint: "still in process" },
  { label: "Interviews scheduled", value: "3", hint: "this & next week" },
  {
    label: "Decisions pending",
    value: "1",
    hint: "offer \u00b7 Friday",
    flag: true,
  },
];

export const PIPELINE_PREVIEW = [
  {
    name: "Applied",
    tone: "primary" as const,
    items: ["Linear", "Vercel", "Anthropic", "+11"],
  },
  {
    name: "Phone screen",
    tone: "amber" as const,
    items: ["Ramp", "Plaid", "+2"],
  },
  { name: "Interview", tone: "amber" as const, items: ["Stripe", "Vercel"] },
  {
    name: "Offer",
    tone: "emerald" as const,
    items: ["Ramp"],
    highlight: true,
  },
  { name: "Rejected", tone: "rose" as const, items: ["Airbnb", "+1"] },
];

// Maps semantic tones to Tailwind classes. Centralized so swapping the
// palette later is a one-file change.
export const toneClasses = {
  primary: {
    dot: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-500/15",
    border: "border-indigo-200 dark:border-indigo-500/30",
    bar: "bg-indigo-500",
  },
  amber: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/15",
    border: "border-amber-200 dark:border-amber-500/30",
    bar: "bg-amber-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    border: "border-emerald-200 dark:border-emerald-500/30",
    bar: "bg-emerald-500",
  },
  rose: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/15",
    border: "border-rose-200 dark:border-rose-500/30",
    bar: "bg-rose-500",
  },
} as const;
