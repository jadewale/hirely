CREATE TABLE "candidate_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"location" text,
	"headline" text,
	"preferred_job_titles" text[] DEFAULT '{}' NOT NULL,
	"preferred_locations" text[] DEFAULT '{}' NOT NULL,
	"remote_preference" text,
	"min_salary_minor" integer,
	"salary_currency" text,
	"work_authorization_countries" text[] DEFAULT '{}' NOT NULL,
	"sponsorship_required" boolean,
	"profile_completion_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_profile" ADD CONSTRAINT "candidate_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_profile_user_id_idx" ON "candidate_profile" USING btree ("user_id");