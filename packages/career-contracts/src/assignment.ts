import { z } from 'zod';
import { assignmentPermissionSchema } from './enums';
import { paginationMetaSchema, userIdSchema } from './common';

/**
 * Assignment contracts (RR-011). An assignment links a CANDIDATE to an
 * ASSISTANT and delegates a specific set of permissions. Assistants act through
 * these grants — never by impersonation on their own authority — and the
 * delegated-authorization guard (RR-012) consults an ACTIVE assignment on every
 * cross-user access. Admins create and revoke assignments.
 */

export const assignmentStatusSchema = z.enum(['ACTIVE', 'REVOKED']);
export type AssignmentStatus = z.infer<typeof assignmentStatusSchema>;

/** Admin creates an assignment: who acts for whom, and with which grants. */
export const createAssignmentInputSchema = z.object({
  candidateUserId: userIdSchema,
  assistantUserId: userIdSchema,
  permissions: z.array(assignmentPermissionSchema).min(1).max(20),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentInputSchema>;

/** An assignment as returned by the API. */
export const assignmentSchema = z.object({
  id: z.uuid(),
  candidateUserId: z.string(),
  assistantUserId: z.string(),
  permissions: z.array(assignmentPermissionSchema),
  status: assignmentStatusSchema,
  createdByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  revokedAt: z.string().nullable(),
});
export type Assignment = z.infer<typeof assignmentSchema>;

/** Filters for listing assignments (admin viewer / assistant's own list). */
export const assignmentQuerySchema = z.object({
  candidateUserId: userIdSchema.optional(),
  assistantUserId: userIdSchema.optional(),
  status: assignmentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type AssignmentQuery = z.infer<typeof assignmentQuerySchema>;

/** A page of assignments plus pagination metadata. */
export const assignmentListSchema = z.object({
  assignments: z.array(assignmentSchema),
  meta: paginationMetaSchema,
});
export type AssignmentList = z.infer<typeof assignmentListSchema>;
