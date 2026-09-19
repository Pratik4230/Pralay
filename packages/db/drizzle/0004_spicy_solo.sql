CREATE TYPE "public"."workspace_status" AS ENUM('active', 'archived');--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "status" "workspace_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "deleted_by" text;