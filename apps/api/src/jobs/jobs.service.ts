import { Inject, Injectable } from "@nestjs/common";
import { eq, desc, and } from "drizzle-orm";
import { type Database } from "../db";
import { jobs, applications } from "../db/schema";
import { randomUUID } from "crypto";

@Injectable()
export class JobsService {
  constructor(@Inject("DATABASE") private db: Database) {}

  async createJob(data: {
    title: string;
    company: string;
    location?: string;
    url?: string;
    description?: string;
    salary?: string;
    source?: string;
    sourceEmailId?: string;
  }) {
    const [job] = await this.db
      .insert(jobs)
      .values({ id: randomUUID(), ...data })
      .returning();
    return job;
  }

  async listJobs() {
    return this.db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: string) {
    const [job] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, id));
    return job;
  }

  async applyToJob(data: {
    jobId: string;
    userId: string;
    appliedBy?: string;
  }) {
    const [application] = await this.db
      .insert(applications)
      .values({
        id: randomUUID(),
        jobId: data.jobId,
        userId: data.userId,
        status: "APPLYING",
        appliedBy: data.appliedBy,
        appliedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return application;
  }

  async getUserApplications(userId: string) {
    return this.db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));
  }

  async updateApplicationStatus(
    id: string,
    status: (typeof applications.$inferInsert)["status"],
  ) {
    const [updated] = await this.db
      .update(applications)
      .set({ status, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }
}
