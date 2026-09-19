import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { contextScopeEnum, workspaceStatusEnum } from "./enums.js";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  avatarKey: text("avatar_key"),
  status: workspaceStatusEnum("status").notNull().default("active"),
  defaultContextScope: contextScopeEnum("default_context_scope")
    .notNull()
    .default("project_and_workspace"),
  enforceProjectMembership: boolean("enforce_project_membership")
    .notNull()
    .default(false),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by"),
});
