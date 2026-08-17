import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  schema,
  type Database,
} from '@career/db';
import {
  auditQuerySchema,
  auditRecordInputSchema,
  type AuditEntry,
  type AuditListResponse,
  type AuditQueryInput,
  type AuditRecordInput,
} from '@career/contracts';
import { DATABASE } from '../db/database.token';
import { redactMetadata } from './redact';

/**
 * Append-only audit service (RR-015).
 *
 * ## Immutability
 * The service intentionally exposes only two operations: `record` (append) and
 * `list` (read). There are no `update`, `delete`, or `truncate` methods; the
 * DB migration installs triggers that RAISE EXCEPTION on those operations, so
 * even a hand-written SQL statement from the app role cannot rewrite history.
 *
 * ## Failure semantics — fail open
 * `record` NEVER throws. If the DB write fails, the error is logged at ERROR
 * (with the action + resource for follow-up) and the promise resolves with
 * `{ persisted: false }`. This is deliberate: audit is a compliance concern
 * that must not take down a user-facing write. Callers `await` the record for
 * ordering but never wrap it in try/catch. If a future feature (e.g. money
 * movement) needs fail-closed auditing, it should call the DB directly rather
 * than change these semantics for every existing caller.
 *
 * ## Sensitive data
 * Metadata is redacted defensively via `redactMetadata` (passwords, tokens,
 * résumé content, etc.). Producers are still expected to pass structured
 * metadata rather than raw request bodies or response payloads.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Append an audit entry. Fail-open: logs and swallows DB errors so a failing
   * audit write does not roll back the caller's business write. Returns
   * `{ persisted: true, id }` on success, `{ persisted: false }` on failure.
   */
  async record(
    input: AuditRecordInput,
  ): Promise<{ persisted: true; id: string } | { persisted: false }> {
    const parsed = auditRecordInputSchema.parse(input);
    const metadata = redactMetadata(parsed.metadata ?? null);

    try {
      const [row] = await this.db
        .insert(schema.auditLog)
        .values({
          actorUserId: parsed.actorUserId,
          actorRole: parsed.actorRole ?? null,
          candidateId: parsed.candidateId ?? null,
          assignmentId: parsed.assignmentId ?? null,
          action: parsed.action,
          resourceType: parsed.resourceType,
          resourceId: parsed.resourceId ?? null,
          requestId: parsed.requestId ?? null,
          ipAddress: parsed.ipAddress ?? null,
          userAgent: parsed.userAgent ?? null,
          metadata,
        })
        .returning({ id: schema.auditLog.id });
      return { persisted: true, id: row.id };
    } catch (err) {
      this.logger.error(
        `audit write failed (action=${parsed.action} resource=${parsed.resourceType}${
          parsed.resourceId ? `#${parsed.resourceId}` : ''
        }): ${err instanceof Error ? err.message : String(err)}`,
      );
      return { persisted: false };
    }
  }

  /**
   * Paginated read for the admin viewer (RR-016). Newest first. Filters are
   * ANDed together; unspecified filters are ignored. Runs two queries (rows +
   * total count) inside a single Drizzle round-trip pair.
   */
  async list(query: AuditQueryInput): Promise<AuditListResponse> {
    const parsed = auditQuerySchema.parse(query);

    const conditions = [
      parsed.actorUserId
        ? eq(schema.auditLog.actorUserId, parsed.actorUserId)
        : undefined,
      parsed.candidateId
        ? eq(schema.auditLog.candidateId, parsed.candidateId)
        : undefined,
      parsed.assignmentId
        ? eq(schema.auditLog.assignmentId, parsed.assignmentId)
        : undefined,
      parsed.action ? eq(schema.auditLog.action, parsed.action) : undefined,
      parsed.resourceType
        ? eq(schema.auditLog.resourceType, parsed.resourceType)
        : undefined,
      parsed.requestId
        ? eq(schema.auditLog.requestId, parsed.requestId)
        : undefined,
      parsed.from
        ? gte(schema.auditLog.createdAt, new Date(parsed.from))
        : undefined,
      parsed.to
        ? lte(schema.auditLog.createdAt, new Date(parsed.to))
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (parsed.page - 1) * parsed.pageSize;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(schema.auditLog)
        .where(where)
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(parsed.pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.auditLog).where(where),
    ]);

    const total = Number(totalRow[0]?.value ?? 0);
    const data: AuditEntry[] = rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      actorRole: (row.actorRole as AuditEntry['actorRole']) ?? null,
      candidateId: row.candidateId,
      assignmentId: row.assignmentId,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      requestId: row.requestId,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      success: true,
      data,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
      },
    };
  }
}
