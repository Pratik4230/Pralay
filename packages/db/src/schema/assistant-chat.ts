import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export type AssistantRunStatus =
  "queued" | "processing" | "completed" | "failed" | "cancelled";

export type AssistantRunOutcome = "assistant_message" | "generation_started";

export type AssistantRunInput = {
  prompt: string;
  referenceAssetIds: string[];
  chatModelId: string;
  aspectRatio?: string;
  enqueueGeneration?: boolean;
};

export const assistantRuns = pgTable(
  "assistant_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => assistantThreads.id, { onDelete: "cascade" }),
    userMessageId: uuid("user_message_id")
      .notNull()
      .references(() => assistantMessages.id, { onDelete: "cascade" }),
    assistantMessageId: uuid("assistant_message_id").references(
      () => assistantMessages.id,
      { onDelete: "set null" },
    ),
    status: text("status")
      .$type<AssistantRunStatus>()
      .notNull()
      .default("queued"),
    outcome: text("outcome").$type<AssistantRunOutcome>(),
    input: jsonb("input").$type<AssistantRunInput>().notNull(),
    errorMessage: text("error_message"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextEventSequence: integer("next_event_sequence").notNull().default(1),
    cancelRequestedAt: timestamp("cancel_requested_at", {
      withTimezone: true,
    }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("assistant_runs_user_message_id_unique").on(
      table.userMessageId,
    ),
    index("assistant_runs_thread_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
    index("assistant_runs_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export type AssistantRunEventType =
  | "reset"
  | "status"
  | "progress"
  | "text_delta"
  | "generation"
  | "completed"
  | "failed"
  | "cancelled";

export const assistantRunEvents = pgTable(
  "assistant_run_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => assistantRuns.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    type: text("type").$type<AssistantRunEventType>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("assistant_run_events_run_sequence_unique").on(
      table.runId,
      table.sequence,
    ),
    index("assistant_run_events_run_created_at_idx").on(
      table.runId,
      table.createdAt,
    ),
  ],
);
