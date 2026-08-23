import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  EmploymentType,
  Job,
  JobInput,
  JobList,
  JobQuery,
  JobRemoteType,
  JobStatus,
  JobUpdate,
} from '@career/contracts';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  schema,
  type Database,
} from '@career/db';
import { DATABASE } from '../db/database.token';

type JobRow = typeof schema.job.$inferSelect;

/**
 * Job catalog service. Admins/assistants create & update jobs; any signed-in
 * user can browse/search. Reads and writes go through `@career/db` only.
 */
@Injectable()
export class JobsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(userId: string, input: JobInput): Promise<Job> {
    const [row] = await this.db
      .insert(schema.job)
      .values({ ...input, createdByUserId: userId })
      .returning();
    return this.toResponse(row);
  }

  async getOne(id: string): Promise<Job> {
    const row = await this.findById(id);
    if (!row) throw new NotFoundException('Job not found');
    return this.toResponse(row);
  }

  /** Patch a job with any subset of fields; unknown/blank keys are ignored. */
  async update(id: string, patch: JobUpdate): Promise<Job> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Job not found');

    // Only write keys the caller actually provided.
    const set: Partial<JobRow> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) (set as Record<string, unknown>)[key] = value;
    }

    const [row] = await this.db
      .update(schema.job)
      .set(set)
      .where(eq(schema.job.id, id))
      .returning();
    return this.toResponse(row);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Job not found');
    await this.db.delete(schema.job).where(eq(schema.job.id, id));
  }

  /** Browse/search with filters + pagination, newest first. */
  async list(query: JobQuery): Promise<JobList> {
    const filters = [];
    if (query.status) filters.push(eq(schema.job.status, query.status));
    if (query.remoteType)
      filters.push(eq(schema.job.remoteType, query.remoteType));
    if (query.employmentType)
      filters.push(eq(schema.job.employmentType, query.employmentType));
    if (query.q) {
      const like = `%${query.q}%`;
      filters.push(
        or(
          ilike(schema.job.title, like),
          ilike(schema.job.company, like),
          ilike(schema.job.description, like),
        ),
      );
    }
    const where = filters.length ? and(...filters) : undefined;

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(schema.job)
      .where(where);

    const rows = await this.db
      .select()
      .from(schema.job)
      .where(where)
      .orderBy(desc(schema.job.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    return {
      jobs: rows.map((r) => this.toResponse(r)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  private async findById(id: string): Promise<JobRow | null> {
    const rows = await this.db
      .select()
      .from(schema.job)
      .where(eq(schema.job.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  private toResponse(row: JobRow): Job {
    return {
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      remoteType: row.remoteType as JobRemoteType | null,
      employmentType: row.employmentType as EmploymentType | null,
      seniority: row.seniority,
      description: row.description,
      salaryMinMinor: row.salaryMinMinor,
      salaryMaxMinor: row.salaryMaxMinor,
      salaryCurrency: row.salaryCurrency,
      source: row.source,
      url: row.url,
      status: row.status as JobStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
