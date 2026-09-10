import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import {
  workspaceInviteStatusEnum,
  workspaceMemberRoleEnum,
} from "./enums.js";
import { workspaces } from "./workspaces.js";

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    status: workspaceInviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedBy: text("invited_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workspace_invites_workspace_id_idx").on(table.workspaceId),
    index("workspace_invites_email_idx").on(table.email),
  ],
);
