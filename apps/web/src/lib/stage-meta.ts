/**
 * Display metadata for every pipeline stage.
 *
 * Centralized so the dashboard, scanning, and settings surfaces all
 * agree on what an `interview` stage looks like. Swap palette / labels
 * here once, not in N component files.
 */
import type { PipelineStage } from "@/hooks/use-threads";

import { toneClasses } from "./onboarding-data";

type Tone = keyof typeof toneClasses;

export const STAGE_META: Record<
  PipelineStage,
  { label: string; tone: Tone; helper: string }
> = {
  applied: {
    label: "Applied",
    tone: "primary",
    helper: "Application sent or acknowledged",
  },
  phone_screen: {
    label: "Phone screen",
    tone: "amber",
    helper: "First contact with a recruiter",
  },
  interview: {
    label: "Interview",
    tone: "amber",
    helper: "On-site or virtual on-site round",
  },
  offer: {
    label: "Offer",
    tone: "emerald",
    helper: "Compensation discussion in progress",
  },
  rejected: {
    label: "Rejected",
    tone: "rose",
    helper: "Closed out by the company",
  },
  ghosted: {
    label: "Ghosted",
    tone: "rose",
    helper: "No response after follow-up",
  },
};
