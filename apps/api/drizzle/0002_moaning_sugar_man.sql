CREATE TABLE "gmail_label" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stage" text NOT NULL,
	"gmail_label_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_label_stage_chk" CHECK ("gmail_label"."stage" IN ('unrelated','applied','phone_screen','interview','offer','rejected','ghosted'))
);
--> statement-breakpoint
ALTER TABLE "gmail_message" ADD COLUMN "draft_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "gmail_message" ADD COLUMN "gmail_draft_id" text;--> statement-breakpoint
ALTER TABLE "gmail_message" ADD COLUMN "draft_body" text;--> statement-breakpoint
ALTER TABLE "gmail_message" ADD COLUMN "drafted_at" timestamp;--> statement-breakpoint
ALTER TABLE "gmail_label" ADD CONSTRAINT "gmail_label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gmail_label_user_stage_uniq" ON "gmail_label" USING btree ("user_id","stage");--> statement-breakpoint
ALTER TABLE "gmail_message" ADD CONSTRAINT "gmail_message_draft_status_chk" CHECK ("gmail_message"."draft_status" IN ('idle','pending','ready','failed'));