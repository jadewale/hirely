import {
  pgTable,
  text,
  timestamp,
  boolean,
  doublePrecision,
  json,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ─── Auth (Better Auth) ───────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Agent / Impersonation ────────────────────────────────────────

export const agentLinks = pgTable(
  "agent_links",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.actorId, table.subjectId)],
);

// ─── Email Classification ─────────────────────────────────────────

export const emailClassEnum = pgEnum("email_class", [
  "UNCLASSIFIED",
  "JOB_OPPORTUNITY",
  "JOB_REJECTION",
  "JOB_INTERVIEW",
  "JOB_OFFER",
  "RECRUITER_OUTREACH",
  "APPLICATION_CONFIRMATION",
  "NOT_JOB_RELATED",
]);

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gmailId: text("gmail_id").notNull().unique(),
    threadId: text("thread_id"),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    snippet: text("snippet"),
    receivedAt: timestamp("received_at").notNull(),
    isJobRelated: boolean("is_job_related").notNull().default(false),
    confidence: doublePrecision("confidence"),
    classification: emailClassEnum("classification")
      .notNull()
      .default("UNCLASSIFIED"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("emails_user_job_idx").on(table.userId, table.isJobRelated),
    index("emails_user_received_idx").on(table.userId, table.receivedAt),
  ],
);

// ─── Job Board ────────────────────────────────────────────────────

export const applicationStatusEnum = pgEnum("application_status", [
  "SAVED",
  "APPLYING",
  "APPLIED",
  "INTERVIEWING",
  "OFFERED",
  "REJECTED",
  "WITHDRAWN",
]);

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  url: text("url"),
  description: text("description"),
  salary: text("salary"),
  source: text("source"), // "email", "manual", "board"
  sourceEmailId: text("source_email_id"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    status: applicationStatusEnum("status").notNull().default("SAVED"),
    appliedBy: text("applied_by"), // agent who applied on behalf
    notes: text("notes"),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.jobId, table.userId)],
);

// ─── Alerts ───────────────────────────────────────────────────────

export const jobAlerts = pgTable(
  "job_alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emailId: text("email_id").notNull(),
    title: text("title").notNull(),
    company: text("company"),
    seen: boolean("seen").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("job_alerts_user_seen_idx").on(table.userId, table.seen)],
);
