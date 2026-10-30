CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"user_id" text,
	"assistant_run_id" uuid,
	"generation_id" uuid,
	"operation" text NOT NULL,
	"modality" text NOT NULL,
	"status" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_input_tokens" integer,
	"reasoning_tokens" integer,
	"provider_cost_micros" integer,
	"credits_charged" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"provider_request_id" text,
	"trace_id" text,
	"error_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_credits" ALTER COLUMN "balance" SET DEFAULT 5000;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
UPDATE "usage_ledger" SET "idempotency_key" = 'legacy:' || "id"::text WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "usage_event_id" uuid;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "balance_after" integer;--> statement-breakpoint
ALTER TABLE "workspace_credits" ADD COLUMN "lifetime_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_assistant_run_id_assistant_runs_id_fk" FOREIGN KEY ("assistant_run_id") REFERENCES "public"."assistant_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_events_idempotency_key_unique" ON "ai_usage_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_usage_events_workspace_created_at_idx" ON "ai_usage_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_project_created_at_idx" ON "ai_usage_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_operation_created_at_idx" ON "ai_usage_events" USING btree ("operation","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_generation_id_idx" ON "ai_usage_events" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "ai_usage_events_assistant_run_id_idx" ON "ai_usage_events" USING btree ("assistant_run_id");--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD CONSTRAINT "usage_ledger_usage_event_id_ai_usage_events_id_fk" FOREIGN KEY ("usage_event_id") REFERENCES "public"."ai_usage_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_ledger_idempotency_key_unique" ON "usage_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_ledger_usage_event_id_unique" ON "usage_ledger" USING btree ("usage_event_id");
