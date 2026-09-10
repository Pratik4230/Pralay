import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces.js";

export const brandKits = pgTable("brand_kits", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  fontFamily: text("font_family"),
  tone: text("tone"),
  styleNotes: text("style_notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
