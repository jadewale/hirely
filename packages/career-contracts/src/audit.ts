import { z } from 'zod';
import { roleSchema } from './enums';
import {
  idSchema,
  paginatedResponseSchema,
  paginationQuerySchema,
} from './common';

/**
 * Contracts for the append-only audit log (RR-015) and its admin read surface
 * (RR-016). The log is write-once from application code: producers `record`
 * events; admins `list` them with filters. Update / delete are not part of the
 * API surface and are enforced immutable at the database layer.
 */

/**
 * Free-form dotted action string (e.g. `application.submitted`,
 * `user.role_changed`). Not an enum so feature tickets can add actions without
 * touching this file — the convention `<resource>.<verb>` is documented but not
 * enforced at parse time.
 */
export const auditActionSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9_.-]+$/i, 'action must be alphanumeric + `._-`');
export type AuditAction = z.infer<typeof auditActionSchema>;

/**
 * Broad category of the resource an action targeted. Kept as a bounded string
 * (rather than a hard enum) so new domains can introduce their own types
 * without a cross-package migration; the initial set covers RR-008 → RR-032.
 */
export const auditResourceTypeSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9_]+$/, 'resource type is SCREAMING_SNAKE_CASE');
export type AuditResourceType = z.infer<typeof auditResourceTypeSchema>;

/**
 * Structured metadata attached to an event. Producers pass small, structured
 * objects (e.g. `{ from: 'DRAFT', to: 'AWAITING_APPROVAL' }`) — NEVER raw
 * request bodies. The audit service strips known-sensitive keys defensively.
 */
export const auditMetadataSchema = z.record(z.string(), z.unknown());
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;

/**
 * Input shape a caller hands to `AuditService.record`. All non-actor fields are
 * optional so the shape scales from a full request-scoped audit (with IP, UA,
 * request id) down to an internal job (`{ action, resourceType, resourceId }`).
 */
export const auditRecordInputSchema = z.object({
  actorUserId: idSchema.nullable(),
  actorRole: roleSchema.nullable().optional(),
  candidateId: idSchema.nullable().optional(),
  assignmentId: idSchema.nullable().optional(),
  action: auditActionSchema,
  resourceType: auditResourceTypeSchema,
  resourceId: z.string().min(1).max(128).nullable().optional(),
  requestId: z.string().min(1).max(128).nullable().optional(),
  ipAddress: z.string().min(1).max(64).nullable().optional(),
  userAgent: z.string().min(1).max(512).nullable().optional(),
  metadata: auditMetadataSchema.nullable().optional(),
});
export type AuditRecordInput = z.infer<typeof auditRecordInputSchema>;

/** Persisted, admin-visible audit entry (RR-016 lists these). */
export const auditEntrySchema = z.object({
  id: idSchema,
  actorUserId: idSchema.nullable(),
  actorRole: roleSchema.nullable(),
  candidateId: idSchema.nullable(),
  assignmentId: idSchema.nullable(),
  action: auditActionSchema,
  resourceType: auditResourceTypeSchema,
  resourceId: z.string().nullable(),
  requestId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: auditMetadataSchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/**
 * Query params for the admin viewer (RR-016). Every field is optional; when
 * none are set the endpoint returns the most recent page, newest first.
 * Coerces query strings so it can bind to Nest `@Query()` directly.
 */
export const auditQuerySchema = paginationQuerySchema.extend({
  actorUserId: idSchema.optional(),
  candidateId: idSchema.optional(),
  assignmentId: idSchema.optional(),
  action: auditActionSchema.optional(),
  resourceType: auditResourceTypeSchema.optional(),
  requestId: z.string().min(1).max(128).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;
/**
 * Pre-parse input type — matches the shape callers hand to `AuditService.list`
 * before defaults (page/pageSize) are applied. Every filter is optional; the
 * service coerces query strings and applies defaults through Zod.
 */
export type AuditQueryInput = z.input<typeof auditQuerySchema>;

/** Envelope returned by the paginated admin viewer. */
export const auditListResponseSchema = paginatedResponseSchema(auditEntrySchema);
export type AuditListResponse = z.infer<typeof auditListResponseSchema>;
