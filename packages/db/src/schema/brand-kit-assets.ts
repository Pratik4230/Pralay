import { index, pgTable, uuid } from "drizzle-orm/pg-core";

import { assets } from "./assets.js";
import { brandKits } from "./brand-kits.js";
import { brandKitAssetPurposeEnum } from "./enums.js";

export const brandKitAssets = pgTable(
  "brand_kit_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandKitId: uuid("brand_kit_id")
      .notNull()
      .references(() => brandKits.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    purpose: brandKitAssetPurposeEnum("purpose").notNull(),
  },
  (table) => [
    index("brand_kit_assets_brand_kit_id_idx").on(table.brandKitId),
    index("brand_kit_assets_asset_id_idx").on(table.assetId),
  ],
);
