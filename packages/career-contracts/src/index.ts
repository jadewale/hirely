/**
 * Shared API contracts for the career-platform — the single source of typed
 * request/response shapes consumed by both `apps/career-api` and
 * `apps/career-web`. Pure Zod schemas + inferred types; no database or ORM
 * detail is exposed here.
 */
export * from './enums';
export * from './common';
export * from './candidate-profile';
export * from './audit';
export * from './assistant';
export * from './resume';
export * from './assignment';
