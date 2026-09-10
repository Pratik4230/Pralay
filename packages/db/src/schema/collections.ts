import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { collectionScopeEnum } from "./enums.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: collectionScopeEnum("scope").notNull(),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    /** Auto-created "My Library" on signup uses isDefault=true for scope=user. */
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("collections_user_id_idx").on(table.userId),
    index("collections_workspace_id_idx").on(table.workspaceId),
    index("collections_project_id_idx").on(table.projectId),
  ],
);
