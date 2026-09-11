import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { contextScopeEnum } from "./enums.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

/** Per-user preferences inside a workspace (context scope toggle, last project). */
export const userWorkspacePreferences = pgTable(
  "user_workspace_preferences",
  {
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    defaultContextScope: contextScopeEnum("default_context_scope")
      .notNull()
      .default("project_and_workspace"),
    lastProjectId: uuid("last_project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workspaceId] })],
);
