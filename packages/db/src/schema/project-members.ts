import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { projectMemberRoleEnum } from "./enums.js";
import { projects } from "./projects.js";

/** Used when workspace.enforce_project_membership is true. */
export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: projectMemberRoleEnum("role").notNull().default("editor"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_members_project_user_uidx").on(
      table.projectId,
      table.userId,
    ),
    index("project_members_user_id_idx").on(table.userId),
  ],
);
