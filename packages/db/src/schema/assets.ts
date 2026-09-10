import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  assetCategoryEnum,
  assetScopeEnum,
  assetTypeEnum,
  assetVisibilityEnum,
} from "./enums.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: assetScopeEnum("scope").notNull().default("workspace"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    ownerUserId: text("owner_user_id"),
    primaryProjectId: uuid("primary_project_id").references(
      () => projects.id,
      { onDelete: "set null" },
    ),
    parentAssetId: uuid("parent_asset_id").references(
      (): AnyPgColumn => assets.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull(),
    category: assetCategoryEnum("category").notNull().default("other"),
    visibility: assetVisibilityEnum("visibility")
      .notNull()
      .default("workspace"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    s3Bucket: text("s3_bucket").notNull(),
    s3Key: text("s3_key").notNull(),
    thumbnailKey: text("thumbnail_key"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    sourceAssetId: uuid("source_asset_id").references(
      (): AnyPgColumn => assets.id,
      { onDelete: "set null" },
    ),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("assets_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("assets_workspace_type_category_idx").on(
      table.workspaceId,
      table.type,
      table.category,
    ),
    index("assets_owner_user_id_idx").on(table.ownerUserId),
    index("assets_primary_project_id_idx").on(table.primaryProjectId),
  ],
);
