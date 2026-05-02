import { Inject, Injectable, Logger } from "@nestjs/common";
import OpenAI from "openai";
import { eq, and, desc } from "drizzle-orm";
import { type Database } from "../db";
import { emails, jobAlerts } from "../db/schema";
import { randomUUID } from "crypto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private openai: OpenAI;

  constructor(@Inject("DATABASE") private db: Database) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async classifyEmail(emailData: {
    from: string;
    subject: string;
    snippet: string;
  }) {
    const prompt = `Classify this email. Is it job-related? If so, what type?

From: ${emailData.from}
Subject: ${emailData.subject}
Preview: ${emailData.snippet}

Respond with JSON:
{
  "isJobRelated": boolean,
  "classification": "JOB_OPPORTUNITY" | "JOB_REJECTION" | "JOB_INTERVIEW" | "JOB_OFFER" | "RECRUITER_OUTREACH" | "APPLICATION_CONFIRMATION" | "NOT_JOB_RELATED",
  "confidence": number between 0 and 1,
  "company": string or null,
  "jobTitle": string or null
}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content!);
  }

  async processAndStoreEmail(
    userId: string,
    emailData: {
      gmailId: string;
      threadId?: string;
      from: string;
      subject: string;
      snippet?: string;
      receivedAt: Date;
    },
  ) {
    const classification = await this.classifyEmail({
      from: emailData.from,
      subject: emailData.subject,
      snippet: emailData.snippet ?? "",
    });

    const id = randomUUID();
    const [stored] = await this.db
      .insert(emails)
      .values({
        id,
        userId,
        gmailId: emailData.gmailId,
        threadId: emailData.threadId,
        from: emailData.from,
        subject: emailData.subject,
        snippet: emailData.snippet,
        receivedAt: emailData.receivedAt,
        isJobRelated: classification.isJobRelated,
        confidence: classification.confidence,
        classification: classification.classification,
        metadata: classification,
      })
      .onConflictDoNothing()
      .returning();

    if (stored && classification.isJobRelated) {
      await this.db.insert(jobAlerts).values({
        id: randomUUID(),
        userId,
        emailId: stored.id,
        title: classification.jobTitle ?? emailData.subject,
        company: classification.company,
      });
    }

    return stored;
  }

  async getUserEmails(userId: string, jobOnly = false) {
    const conditions = [eq(emails.userId, userId)];
    if (jobOnly) {
      conditions.push(eq(emails.isJobRelated, true));
    }
    return this.db
      .select()
      .from(emails)
      .where(and(...conditions))
      .orderBy(desc(emails.receivedAt));
  }

  async getUserAlerts(userId: string, unseenOnly = false) {
    const conditions = [eq(jobAlerts.userId, userId)];
    if (unseenOnly) {
      conditions.push(eq(jobAlerts.seen, false));
    }
    return this.db
      .select()
      .from(jobAlerts)
      .where(and(...conditions))
      .orderBy(desc(jobAlerts.createdAt));
  }
}
