import { index, integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.js";
import { collections } from "./collections.js";

export const collectionAssets = pgTable(
  "collection_assets",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.assetId] }),
    index("collection_assets_asset_id_idx").on(table.assetId),
  ],
);
