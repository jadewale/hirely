import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, schema, type Database } from '@career/db';
import type {
  AssistantStatus,
  UpsertAssistantProfileInput,
} from '@career/contracts';
import { DATABASE } from '../db/database.token';
import { AssistantProfileDto } from './dto/assistant-profile.dto';

type AssistantProfileRow = typeof schema.assistantProfile.$inferSelect;

/**
 * Persistence + business logic for assistant profiles (RR-010). The only DB
 * entry point is the injected Drizzle client; controllers stay HTTP-only.
 *
 * `getByUserId` returns the raw row (null when absent) so downstream services —
 * notably the delegated-authorization service (RR-012), which needs `status` —
 * can reuse it without a DTO round-trip. The controllers map to a DTO via
 * `toDto`.
 */
@Injectable()
export class AssistantProfileService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getByUserId(userId: string): Promise<AssistantProfileRow | null> {
    const [row] = await this.db
      .select()
      .from(schema.assistantProfile)
      .where(eq(schema.assistantProfile.userId, userId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Create the caller's profile or replace its editable fields. `status` is
   * intentionally NOT in the conflict `set`: an assistant editing their profile
   * must never clear an admin-applied SUSPENDED. `updatedAt` is set explicitly
   * because Drizzle's `$onUpdate` only fires on `.update()`, not on a conflict
   * update.
   */
  async upsertForUser(
    userId: string,
    input: UpsertAssistantProfileInput,
  ): Promise<AssistantProfileRow> {
    const editable = {
      displayName: input.displayName,
      headline: input.headline ?? null,
      bio: input.bio ?? null,
      timezone: input.timezone ?? null,
      hourlyRateCents: input.hourlyRateCents ?? null,
    };
    const [row] = await this.db
      .insert(schema.assistantProfile)
      .values({ userId, ...editable })
      .onConflictDoUpdate({
        target: schema.assistantProfile.userId,
        set: { ...editable, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  /** Admin-only status change. 404 when the target has no profile yet. */
  async setStatus(
    userId: string,
    status: AssistantStatus,
  ): Promise<AssistantProfileRow> {
    const [row] = await this.db
      .update(schema.assistantProfile)
      .set({ status })
      .where(eq(schema.assistantProfile.userId, userId))
      .returning();
    if (!row) {
      throw new NotFoundException(`No assistant profile for user ${userId}`);
    }
    return row;
  }

  /** Map a persisted row to its API shape (timestamps as ISO strings). */
  static toDto(row: AssistantProfileRow): AssistantProfileDto {
    return {
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      headline: row.headline,
      bio: row.bio,
      timezone: row.timezone,
      hourlyRateCents: row.hourlyRateCents,
      status: row.status as AssistantProfileDto['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
