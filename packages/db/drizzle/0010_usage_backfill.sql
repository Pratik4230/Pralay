INSERT INTO "workspace_credits" ("workspace_id", "balance", "lifetime_used")
SELECT "id", 5000, 0
FROM "workspaces"
ON CONFLICT ("workspace_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ai_usage_events" (
  "idempotency_key",
  "workspace_id",
  "project_id",
  "user_id",
  "generation_id",
  "operation",
  "modality",
  "status",
  "provider",
  "model",
  "metrics",
  "credits_charged",
  "latency_ms",
  "started_at",
  "completed_at",
  "metadata"
)
SELECT
  'generation:' || "id"::text || ':completed',
  "workspace_id",
  "project_id",
  "created_by",
  "id",
  CASE
    WHEN "type" = 'generate' THEN 'image.generate'
    WHEN "type" = 'resize' THEN 'media.resize'
    ELSE 'image.edit'
  END,
  CASE WHEN "type" = 'resize' THEN 'other' ELSE 'image' END,
  'succeeded',
  COALESCE("provider", CASE WHEN "type" = 'resize' THEN 'sharp' ELSE 'unknown' END),
  COALESCE("model", CASE WHEN "type" = 'resize' THEN 'sharp' ELSE 'unknown' END),
  jsonb_build_object(
    'inputImages', cardinality("input_asset_ids"),
    'outputImages', CASE WHEN "type" = 'resize' THEN 0 ELSE cardinality("output_asset_ids") END,
    'width', "width",
    'height', "height",
    'pixels', CASE WHEN "width" IS NOT NULL AND "height" IS NOT NULL THEN "width" * "height" ELSE NULL END,
    'attempts', "retry_count" + 1
  ),
  0,
  GREATEST(0, (EXTRACT(EPOCH FROM ("completed_at" - COALESCE("started_at", "created_at"))) * 1000)::integer),
  COALESCE("started_at", "created_at"),
  "completed_at",
  jsonb_build_object('backfilled', true, 'creditPolicyVersion', 'pre-metering')
FROM "generations"
WHERE "status" = 'completed'
  AND "completed_at" IS NOT NULL
  AND "deleted_at" IS NULL
ON CONFLICT ("idempotency_key") DO NOTHING;
