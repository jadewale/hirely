CREATE TABLE "gmail_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gmail_message_id" text NOT NULL,
	"gmail_thread_id" text NOT NULL,
	"sender" text NOT NULL,
	"sender_email" text NOT NULL,
	"subject" text NOT NULL,
	"snippet" text,
	"received_at" timestamp NOT NULL,
	"stage" text NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text,
	"applied_label_ids" jsonb,
	"classified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_message_stage_chk" CHECK ("gmail_message"."stage" IN ('unrelated','applied','phone_screen','interview','offer','rejected','ghosted'))
);
--> statement-breakpoint
CREATE TABLE "inbox_scan_progress" (
	"run_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"target_total" integer NOT NULL,
	"discovered_total" integer DEFAULT 0 NOT NULL,
	"classified_count" integer DEFAULT 0 NOT NULL,
	"batches_total" integer DEFAULT 0 NOT NULL,
	"batches_completed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_scan_progress_status_chk" CHECK ("inbox_scan_progress"."status" IN ('listing','classifying','completed','failed'))
);
--> statement-breakpoint
ALTER TABLE "gmail_message" ADD CONSTRAINT "gmail_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_scan_progress" ADD CONSTRAINT "inbox_scan_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gmail_message_user_message_uniq" ON "gmail_message" USING btree ("user_id","gmail_message_id");--> statement-breakpoint
CREATE INDEX "gmail_message_user_stage_received_idx" ON "gmail_message" USING btree ("user_id","stage","received_at");--> statement-breakpoint
CREATE INDEX "inbox_scan_progress_user_started_idx" ON "inbox_scan_progress" USING btree ("user_id","started_at");