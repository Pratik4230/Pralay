ALTER TYPE "public"."notification_type" ADD VALUE 'ai_budget';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'ai_anomaly';--> statement-breakpoint
CREATE TABLE "project_ai_budgets" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"monthly_limit" integer,
	"period_start" timestamp with time zone NOT NULL,
	"period_used" integer DEFAULT 0 NOT NULL,
	"reserved_credits" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "project_ai_budgets" ADD CONSTRAINT "project_ai_budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_budgets" ADD CONSTRAINT "project_ai_budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_ai_budgets_workspace_id_idx" ON "project_ai_budgets" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_unique" ON "notifications" USING btree ("dedupe_key");