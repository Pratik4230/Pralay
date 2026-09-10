import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { templateVisibilityEnum } from "./enums.js";
import { presets } from "./presets.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id"),
  name: text("name").notNull(),
  description: text("description"),
  structure: jsonb("structure").$type<Record<string, unknown>>().notNull(),
  presetId: uuid("preset_id").references(() => presets.id, {
    onDelete: "set null",
  }),
  visibility: templateVisibilityEnum("visibility")
    .notNull()
    .default("workspace"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
