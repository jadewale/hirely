/**
 * Shared API contracts for the career-platform.
 *
 * The real schemas — response envelope, pagination, validation errors, shared
 * identifiers, and the role / permission / status enums — are added in RR-004.
 * This skeleton only establishes the package boundary so `apps/career-api` and
 * `apps/career-web` can both depend on a single source of typed contracts
 * without either reaching into the other's source.
 */
export const CONTRACTS_PACKAGE_VERSION = '0.0.0' as const;
