import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets.js";
import { projects } from "./projects.js";

/** Many-to-many: projects ↔ assets (in addition to assets.primary_project_id). */
export const projectAssets = pgTable(
  "project_assets",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.assetId] }),
    index("project_assets_asset_id_idx").on(table.assetId),
  ],
);
