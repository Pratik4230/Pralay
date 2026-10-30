CREATE TABLE "ai_credit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"user_id" text,
	"operation" text NOT NULL,
	"credits" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"usage_event_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_credits" ADD COLUMN "reserved_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_credits" ADD COLUMN "low_credit_threshold" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_credit_reservations" ADD CONSTRAINT "ai_credit_reservations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_reservations" ADD CONSTRAINT "ai_credit_reservations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credit_reservations" ADD CONSTRAINT "ai_credit_reservations_usage_event_id_ai_usage_events_id_fk" FOREIGN KEY ("usage_event_id") REFERENCES "public"."ai_usage_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_credit_reservations_idempotency_key_unique" ON "ai_credit_reservations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_credit_reservations_workspace_status_idx" ON "ai_credit_reservations" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ai_credit_reservations_expires_at_idx" ON "ai_credit_reservations" USING btree ("expires_at");