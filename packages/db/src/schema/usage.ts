import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { generations } from "./generations.js";
import { workspaces } from "./workspaces.js";

export const workspaceCredits = pgTable("workspace_credits", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usageLedger = pgTable(
  "usage_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    creditsDelta: integer("credits_delta").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_ledger_workspace_id_idx").on(table.workspaceId),
    index("usage_ledger_generation_id_idx").on(table.generationId),
  ],
);
