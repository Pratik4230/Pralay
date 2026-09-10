import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { presetCategoryEnum } from "./enums.js";
import { workspaces } from "./workspaces.js";

export const presets = pgTable(
  "presets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: presetCategoryEnum("category").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    aspectRatio: text("aspect_ratio").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("presets_workspace_id_idx").on(table.workspaceId)],
);
