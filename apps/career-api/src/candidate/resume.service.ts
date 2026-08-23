import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  CreateResumeInput,
  CreateResumeResponse,
  Resume,
  ResumeDownload,
  ResumeList,
  ResumeStatus,
} from '@career/contracts';
import { and, desc, eq, schema, type Database } from '@career/db';
import { DATABASE } from '../db/database.token';
import { S3Service } from '../storage/s3.service';

type ResumeRow = typeof schema.resume.$inferSelect;

/**
 * Résumé metadata + storage orchestration (RR-018).
 *
 * File bytes NEVER pass through this service or Postgres: the browser uploads
 * straight to S3 with a pre-signed URL, then confirms. Every read/write is
 * scoped to the SESSION user — lookups match on `(id, userId)` so a candidate
 * can only ever touch their own résumés, even if the browser supplies someone
 * else's id.
 */
@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly s3: S3Service,
  ) {}

  /** Create a PENDING row and mint a pre-signed upload URL. */
  async create(
    userId: string,
    input: CreateResumeInput,
  ): Promise<CreateResumeResponse> {
    if (!this.s3.isConfigured) {
      throw new ServiceUnavailableException('Résumé storage is not configured');
    }
    const storageKey = `resumes/${userId}/${randomUUID()}`;
    const [row] = await this.db
      .insert(schema.resume)
      .values({
        userId,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey,
        status: 'PENDING',
      })
      .returning();

    const upload = await this.s3.presignPut(storageKey, input.contentType);
    // TODO(audit): record a `resume.created` event once the audit contract
    // accepts Better Auth's text user ids (RR-015 `actorUserId` is `z.uuid()`,
    // which rejects them — see the note filed with RR-018).
    return {
      resume: this.toResponse(row),
      upload: {
        url: upload.url,
        method: 'PUT',
        headers: { 'Content-Type': input.contentType },
        expiresInSeconds: upload.expiresInSeconds,
      },
    };
  }

  /** Mark a résumé READY after verifying the object actually landed in S3. */
  async confirm(userId: string, id: string): Promise<Resume> {
    const row = await this.findOwn(userId, id);
    if (!row) throw new NotFoundException('Résumé not found');
    if (!(await this.s3.objectExists(row.storageKey))) {
      throw new BadRequestException('Upload not found in storage');
    }
    const [updated] = await this.db
      .update(schema.resume)
      .set({ status: 'READY', updatedAt: new Date() })
      .where(and(eq(schema.resume.id, id), eq(schema.resume.userId, userId)))
      .returning();
    return this.toResponse(updated);
  }

  /** List the caller's own résumés, newest first. */
  async list(userId: string): Promise<ResumeList> {
    const rows = await this.db
      .select()
      .from(schema.resume)
      .where(eq(schema.resume.userId, userId))
      .orderBy(desc(schema.resume.createdAt));
    return { resumes: rows.map((r) => this.toResponse(r)) };
  }

  /** Mint a short-lived download URL for the caller's own résumé. */
  async download(userId: string, id: string): Promise<ResumeDownload> {
    const row = await this.findOwn(userId, id);
    if (!row) throw new NotFoundException('Résumé not found');
    return this.s3.presignGet(row.storageKey, row.fileName);
  }

  /** Delete the caller's own résumé: remove the S3 object then the DB row. */
  async remove(userId: string, id: string): Promise<void> {
    const row = await this.findOwn(userId, id);
    if (!row) throw new NotFoundException('Résumé not found');
    try {
      await this.s3.deleteObject(row.storageKey);
    } catch (err) {
      // Best-effort: a leftover object is swept later; never block the delete.
      this.logger.warn(
        `failed to delete S3 object ${row.storageKey}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    await this.db
      .delete(schema.resume)
      .where(and(eq(schema.resume.id, id), eq(schema.resume.userId, userId)));
    // TODO(audit): record `resume.deleted` — see create().
  }

  /** Ownership-scoped lookup: matches BOTH id and userId. */
  private async findOwn(userId: string, id: string): Promise<ResumeRow | null> {
    const rows = await this.db
      .select()
      .from(schema.resume)
      .where(and(eq(schema.resume.id, id), eq(schema.resume.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  private toResponse(row: ResumeRow): Resume {
    return {
      id: row.id,
      fileName: row.fileName,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      status: row.status as ResumeStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
