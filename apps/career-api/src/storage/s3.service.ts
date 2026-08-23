import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Pre-signed URL TTLs. Uploads get a wider window than downloads. */
const PUT_TTL_SECONDS = 15 * 60;
const GET_TTL_SECONDS = 5 * 60;

/** A signed URL plus how long it is valid. */
export interface SignedUrl {
  url: string;
  expiresInSeconds: number;
}

/**
 * Thin S3 wrapper for résumé storage (RR-018). Mirrors the SES provider's
 * conventions: region from `AWS_REGION`/`AWS_DEFAULT_REGION` (default
 * `us-east-1`), credentials via the default provider chain (the ECS task role
 * in prod — no static secrets), and an optionally injected client for tests.
 *
 * `CAREER_S3_ENDPOINT` points the client at a local MinIO/LocalStack for
 * offline dev (path-style addressing). The bucket comes from
 * `CAREER_RESUME_BUCKET`; when unset, {@link isConfigured} is false and the
 * feature returns 503 rather than signing URLs for a nonexistent bucket.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  readonly bucket: string;

  constructor(@Optional() client?: S3Client) {
    const region =
      process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
    const endpoint = process.env.CAREER_S3_ENDPOINT; // set for local MinIO
    this.bucket = process.env.CAREER_RESUME_BUCKET ?? '';
    this.client =
      client ??
      new S3Client({
        region,
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      });
  }

  /** Whether a bucket is configured; upload endpoints 503 when false. */
  get isConfigured(): boolean {
    return this.bucket.length > 0;
  }

  /** Sign a PUT for a direct browser→S3 upload. The `Content-Type` is part of
   * the signature, so the client MUST send it verbatim on the PUT. */
  async presignPut(key: string, contentType: string): Promise<SignedUrl> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: PUT_TTL_SECONDS },
    );
    return { url, expiresInSeconds: PUT_TTL_SECONDS };
  }

  /** Sign a GET download, forcing a save dialog with the original filename. */
  async presignGet(key: string, fileName: string): Promise<SignedUrl> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${sanitizeFileName(
          fileName,
        )}"`,
      }),
      { expiresIn: GET_TTL_SECONDS },
    );
    return { url, expiresInSeconds: GET_TTL_SECONDS };
  }

  /** True if the object exists — used to confirm a client-reported upload. */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Best-effort delete; callers log-and-continue so a stray object never
   * blocks removing the DB row. */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

/** Strip anything that could break the Content-Disposition header or path. */
function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 200) || 'resume';
}
