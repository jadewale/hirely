import { z } from 'zod';

/**
 * Common API primitives shared by every endpoint: identifiers, pagination, the
 * response envelope, and validation errors. Pure transport shapes — no database
 * or ORM detail leaks through here.
 */

/** Every resource ID is a UUID (see database conventions: UUID primary keys). */
export const idSchema = z.uuid();
export type Id = z.infer<typeof idSchema>;

/**
 * A Better Auth user id. NOT a UUID — Better Auth mints random alphanumeric ids
 * (e.g. `26tDhxI5EOBXGlL6ynNfDprIY4eaDEGV`) and stores them as `text`. Use this
 * anywhere a `user.id` is referenced (never `idSchema`, which is uuid-only).
 */
export const userIdSchema = z.string().min(1).max(255);
export type UserId = z.infer<typeof userIdSchema>;

/** Pagination request (query params). Coerces string query values to numbers. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Pagination metadata returned with a page of results. */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** A single field-level validation failure (a flattened Zod issue). */
export const validationErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string().optional(),
});
export type ValidationError = z.infer<typeof validationErrorSchema>;

/** Error envelope for any failed request. */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    validation: z.array(validationErrorSchema).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** Success envelope factory — wraps any data schema as `{ success: true, data }`. */
export function successResponseSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), data });
}
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/** Paginated success envelope factory — an array of items plus pagination meta. */
export function paginatedResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(item),
    pagination: paginationMetaSchema,
  });
}
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
