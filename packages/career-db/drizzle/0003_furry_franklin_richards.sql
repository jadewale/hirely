CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text,
	"actor_role" text,
	"candidate_id" uuid,
	"assignment_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_candidate_id_idx" ON "audit_log" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "audit_log_assignment_id_idx" ON "audit_log" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_resource_type_idx" ON "audit_log" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_log_request_id_idx" ON "audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
-- RR-015: enforce append-only at the DATABASE layer, not just in code. The
-- BEFORE UPDATE / DELETE / TRUNCATE triggers below raise EXCEPTION regardless
-- of role, so even a hand-run SQL statement from the migration/admin role
-- cannot rewrite history. INSERT and SELECT remain unrestricted. If we ever
-- need to change the shape of the table itself (add/rename a column), the
-- schema change goes through drizzle-kit; the triggers do not block ALTER.
CREATE OR REPLACE FUNCTION audit_log_prevent_change()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (attempted %)', TG_OP
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_change();--> statement-breakpoint
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_change();--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_prevent_change();