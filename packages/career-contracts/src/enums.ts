import { z } from 'zod';

/**
 * Shared enums for the career-platform API. These are the authoritative string
 * unions used across career-api and career-web. Each ships as a Zod schema (for
 * runtime validation) plus its inferred type (for compile-time use).
 */

/** Supported user roles. A user has exactly one role; it is never self-editable. */
export const roleSchema = z.enum(['CANDIDATE', 'ASSISTANT', 'ADMIN']);
export type Role = z.infer<typeof roleSchema>;

/**
 * Permissions an assignment can delegate from a candidate to an assistant.
 * Assistants act through these grants, never by impersonation.
 */
export const assignmentPermissionSchema = z.enum([
  'candidate.profile.read',
  'candidate.documents.read',
  'application.create',
  'application.read',
  'application.update',
  'application.submit_for_approval',
]);
export type AssignmentPermission = z.infer<typeof assignmentPermissionSchema>;

/**
 * Account posture of an assistant's profile (RR-010). A SUSPENDED assistant is
 * rejected from acting on any assignment by the delegated-authorization service
 * (RR-012); only an admin can move a profile between these states.
 */
export const assistantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);
export type AssistantStatus = z.infer<typeof assistantStatusSchema>;

/** Application lifecycle states (transitions enforced by the state machine, RR-023). */
export const applicationStatusSchema = z.enum([
  'DRAFT',
  'AWAITING_APPROVAL',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SUBMITTED',
  'SUBMISSION_FAILED',
  'CANCELLED',
  'EXPIRED',
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

/** Work-order lifecycle states (payments/payouts, RR-027+). */
export const workOrderStatusSchema = z.enum([
  'PAYMENT_PENDING',
  'FUNDED',
  'WORK_IN_PROGRESS',
  'AWAITING_APPROVAL',
  'APPROVED',
  'PAYOUT_PENDING',
  'PAID',
  'CANCELLED',
  'DISPUTED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;
