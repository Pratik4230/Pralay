CREATE TABLE "assistant_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_message_id" uuid NOT NULL,
	"assistant_message_id" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"outcome" text,
	"input" jsonb NOT NULL,
	"error_message" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_event_sequence" integer DEFAULT 1 NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_run_events" ADD CONSTRAINT "assistant_run_events_run_id_assistant_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."assistant_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_user_message_id_assistant_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."assistant_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_runs" ADD CONSTRAINT "assistant_runs_assistant_message_id_assistant_messages_id_fk" FOREIGN KEY ("assistant_message_id") REFERENCES "public"."assistant_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_run_events_run_sequence_unique" ON "assistant_run_events" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE INDEX "assistant_run_events_run_created_at_idx" ON "assistant_run_events" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_runs_user_message_id_unique" ON "assistant_runs" USING btree ("user_message_id");--> statement-breakpoint
CREATE INDEX "assistant_runs_thread_created_at_idx" ON "assistant_runs" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "assistant_runs_status_updated_at_idx" ON "assistant_runs" USING btree ("status","updated_at");