import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { contextScopeEnum, projectStatusEnum } from "./enums.js";
import { workspaces } from "./workspaces.js";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    coverKey: text("cover_key"),
    status: projectStatusEnum("status").notNull().default("active"),
    contextScope: contextScopeEnum("context_scope")
      .notNull()
      .default("project_and_workspace"),
    restrictAccess: boolean("restrict_access").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("projects_workspace_slug_uidx").on(
      table.workspaceId,
      table.slug,
    ),
    index("projects_workspace_id_idx").on(table.workspaceId),
  ],
);
