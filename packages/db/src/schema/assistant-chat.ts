import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { assistantMessageRoleEnum } from "./enums.js";
import { generations } from "./generations.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export const assistantThreads = pgTable(
  "assistant_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdBy: text("created_by").notNull(),
    title: text("title"),
    titleAuto: boolean("title_auto").notNull().default(true),
    summary: text("summary"),
    summaryThroughMessageId: uuid("summary_through_message_id").references(
      (): AnyPgColumn => assistantMessages.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("assistant_threads_project_updated_at_idx").on(
      table.projectId,
      table.updatedAt,
    ),
    index("assistant_threads_workspace_id_idx").on(table.workspaceId),
  ],
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => assistantThreads.id, { onDelete: "cascade" }),
    role: assistantMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    referenceAssetIds: uuid("reference_asset_ids")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    parts: jsonb("parts").$type<Record<string, unknown>[]>(),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("assistant_messages_thread_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
  ],
);
