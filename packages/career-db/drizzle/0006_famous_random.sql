CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_user_id" text NOT NULL,
	"assistant_user_id" text NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_candidate_user_id_user_id_fk" FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_assistant_user_id_user_id_fk" FOREIGN KEY ("assistant_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_candidate_user_id_idx" ON "assignment" USING btree ("candidate_user_id");--> statement-breakpoint
CREATE INDEX "assignment_assistant_user_id_idx" ON "assignment" USING btree ("assistant_user_id");