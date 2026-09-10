import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.js";
import { generations } from "./generations.js";

export const assetVersions = pgTable(
  "asset_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    s3Key: text("s3_key").notNull(),
    operation: text("operation").notNull(),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("asset_versions_asset_id_idx").on(table.assetId),
    index("asset_versions_generation_id_idx").on(table.generationId),
  ],
);
