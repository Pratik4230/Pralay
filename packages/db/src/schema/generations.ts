import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  contextScopeEnum,
  generationStatusEnum,
  generationTypeEnum,
} from "./enums.js";
import { presets } from "./presets.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const generations = pgTable(
  "generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").notNull(),
    contextScope: contextScopeEnum("context_scope")
      .notNull()
      .default("project_and_workspace"),
    type: generationTypeEnum("type").notNull(),
    status: generationStatusEnum("status").notNull().default("queued"),
    prompt: text("prompt").notNull(),
    negativePrompt: text("negative_prompt"),
    structuredContext: jsonb("structured_context")
      .$type<Record<string, unknown>>()
      .default({}),
    collectionIds: uuid("collection_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    presetId: uuid("preset_id").references(() => presets.id, {
      onDelete: "set null",
    }),
    width: integer("width"),
    height: integer("height"),
    aspectRatio: text("aspect_ratio"),
    quality: text("quality"),
    variationCount: integer("variation_count").notNull().default(1),
    provider: text("provider"),
    model: text("model"),
    providerRequestId: text("provider_request_id"),
    inputAssetIds: uuid("input_asset_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    referenceRoles: jsonb("reference_roles")
      .$type<Record<string, unknown>>()
      .default({}),
    outputAssetIds: uuid("output_asset_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    batchId: uuid("batch_id").references((): AnyPgColumn => generations.id, {
      onDelete: "set null",
    }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    creditCost: integer("credit_cost"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
  },
  (table) => [
    index("generations_workspace_status_created_at_idx").on(
      table.workspaceId,
      table.status,
      table.createdAt,
    ),
    index("generations_created_by_created_at_idx").on(
      table.createdBy,
      table.createdAt,
    ),
    index("generations_project_id_idx").on(table.projectId),
    index("generations_batch_id_idx").on(table.batchId),
  ],
);
