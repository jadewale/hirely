import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Assignment,
  AssignmentList,
  AssignmentQuery,
  AssignmentPermission,
  CreateAssignmentInput,
  AssignmentStatus,
} from '@career/contracts';
import { and, count, desc, eq, schema, type Database } from '@career/db';
import { DATABASE } from '../db/database.token';
import { AuditService } from '../audit/audit.service';

type AssignmentRow = typeof schema.assignment.$inferSelect;

/**
 * Assignments (RR-011) + delegated-authorization checks (RR-012).
 *
 * An assignment links a candidate to an assistant with a set of permissions.
 * Admins create/revoke them; the delegated check ({@link assertPermission}) is
 * what every assistant→candidate access path calls to prove the assistant may
 * act — the same active assignment also gates impersonation. Create/revoke are
 * audited.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  /** Admin creates an assignment after validating both users' roles. */
  async create(
    input: CreateAssignmentInput,
    actorUserId: string,
  ): Promise<Assignment> {
    await this.assertRole(input.candidateUserId, 'CANDIDATE');
    await this.assertRole(input.assistantUserId, 'ASSISTANT');

    // One active assignment per (candidate, assistant) pair.
    const existing = await this.findActive(
      input.assistantUserId,
      input.candidateUserId,
    );
    if (existing) {
      throw new BadRequestException(
        'An active assignment already exists for this candidate and assistant',
      );
    }

    const [row] = await this.db
      .insert(schema.assignment)
      .values({
        candidateUserId: input.candidateUserId,
        assistantUserId: input.assistantUserId,
        permissions: input.permissions,
        status: 'ACTIVE',
        createdByUserId: actorUserId,
      })
      .returning();

    await this.audit.record({
      actorUserId,
      action: 'assignment.created',
      resourceType: 'ASSIGNMENT',
      resourceId: row.id,
      metadata: {
        candidateUserId: input.candidateUserId,
        assistantUserId: input.assistantUserId,
        permissions: input.permissions,
      },
    });
    return this.toResponse(row);
  }

  /** Revoke an assignment (idempotent-ish: revoking a revoked one 400s). */
  async revoke(id: string, actorUserId: string): Promise<Assignment> {
    const row = await this.findById(id);
    if (!row) throw new NotFoundException('Assignment not found');
    if (row.status === 'REVOKED') {
      throw new BadRequestException('Assignment is already revoked');
    }
    const now = new Date();
    const [updated] = await this.db
      .update(schema.assignment)
      .set({ status: 'REVOKED', revokedAt: now, updatedAt: now })
      .where(eq(schema.assignment.id, id))
      .returning();

    await this.audit.record({
      actorUserId,
      action: 'assignment.revoked',
      resourceType: 'ASSIGNMENT',
      resourceId: id,
      metadata: {
        candidateUserId: row.candidateUserId,
        assistantUserId: row.assistantUserId,
      },
    });
    return this.toResponse(updated);
  }

  async list(query: AssignmentQuery): Promise<AssignmentList> {
    const filters = [];
    if (query.candidateUserId)
      filters.push(
        eq(schema.assignment.candidateUserId, query.candidateUserId),
      );
    if (query.assistantUserId)
      filters.push(
        eq(schema.assignment.assistantUserId, query.assistantUserId),
      );
    if (query.status) filters.push(eq(schema.assignment.status, query.status));
    const where = filters.length ? and(...filters) : undefined;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.assignment)
      .where(where);

    const rows = await this.db
      .select()
      .from(schema.assignment)
      .where(where)
      .orderBy(desc(schema.assignment.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    return {
      assignments: rows.map((r) => this.toResponse(r)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * RR-012 delegated authorization. Throws unless the assistant has an ACTIVE
   * assignment to the candidate carrying `permission` AND is not suspended.
   * Returns the assignment so callers can attribute the action to it.
   */
  async assertPermission(
    assistantUserId: string,
    candidateUserId: string,
    permission: AssignmentPermission,
  ): Promise<AssignmentRow> {
    const active = await this.findActive(assistantUserId, candidateUserId);
    if (!active || !active.permissions.includes(permission)) {
      throw new ForbiddenException(
        'No active assignment grants this permission for that candidate',
      );
    }
    if (await this.isAssistantSuspended(assistantUserId)) {
      throw new ForbiddenException('Assistant account is suspended');
    }
    return active;
  }

  private async assertRole(
    userId: string,
    role: 'CANDIDATE' | 'ASSISTANT',
  ): Promise<void> {
    const [u] = await this.db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    if (!u) throw new BadRequestException(`User ${userId} does not exist`);
    if (u.role !== role) {
      throw new BadRequestException(
        `User ${userId} is not a ${role} (got ${u.role ?? 'none'})`,
      );
    }
  }

  private async isAssistantSuspended(
    assistantUserId: string,
  ): Promise<boolean> {
    const [p] = await this.db
      .select({ status: schema.assistantProfile.status })
      .from(schema.assistantProfile)
      .where(eq(schema.assistantProfile.userId, assistantUserId))
      .limit(1);
    return p?.status === 'SUSPENDED';
  }

  private async findActive(
    assistantUserId: string,
    candidateUserId: string,
  ): Promise<AssignmentRow | null> {
    const rows = await this.db
      .select()
      .from(schema.assignment)
      .where(
        and(
          eq(schema.assignment.assistantUserId, assistantUserId),
          eq(schema.assignment.candidateUserId, candidateUserId),
          eq(schema.assignment.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async findById(id: string): Promise<AssignmentRow | null> {
    const rows = await this.db
      .select()
      .from(schema.assignment)
      .where(eq(schema.assignment.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  private toResponse(row: AssignmentRow): Assignment {
    return {
      id: row.id,
      candidateUserId: row.candidateUserId,
      assistantUserId: row.assistantUserId,
      permissions: row.permissions as AssignmentPermission[],
      status: row.status as AssignmentStatus,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    };
  }
}
