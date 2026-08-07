/**
 * Re-exports the shared API contracts for use across career-web's ViewModels
 * (hooks) and Models (lib). The web app consumes types + Zod schemas from
 * `@career/contracts`; it must never import `@career/db`.
 */
export {
  roleSchema,
  applicationStatusSchema,
  workOrderStatusSchema,
  assignmentPermissionSchema,
  paginationQuerySchema,
  type Role,
  type ApplicationStatus,
  type WorkOrderStatus,
  type AssignmentPermission,
  type PaginationQuery,
  type PaginationMeta,
  type ValidationError,
  type SuccessResponse,
  type PaginatedResponse,
} from '@career/contracts';
