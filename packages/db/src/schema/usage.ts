import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assistantRuns } from "./assistant-chat.js";
import { generations } from "./generations.js";
import { projects } from "./projects.js";
import { workspaces } from "./workspaces.js";

export type AiUsageModality =
  "text" | "image" | "audio" | "video" | "embedding" | "tool" | "other";

export type AiUsageStatus = "succeeded" | "failed";

/** Provider-neutral counters. New providers can add numeric keys without a migration. */
export type AiUsageMetrics = Record<string, number | null | undefined>;

export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id"),
    assistantRunId: uuid("assistant_run_id").references(
      () => assistantRuns.id,
      { onDelete: "set null" },
    ),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    operation: text("operation").notNull(),
    modality: text("modality").$type<AiUsageModality>().notNull(),
    status: text("status").$type<AiUsageStatus>().notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    metrics: jsonb("metrics").$type<AiUsageMetrics>().notNull().default({}),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    providerCostMicros: integer("provider_cost_micros"),
    creditsCharged: integer("credits_charged").notNull().default(0),
    latencyMs: integer("latency_ms"),
    providerRequestId: text("provider_request_id"),
    traceId: text("trace_id"),
    errorCode: text("error_code"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ai_usage_events_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("ai_usage_events_workspace_created_at_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    index("ai_usage_events_project_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("ai_usage_events_operation_created_at_idx").on(
      table.operation,
      table.createdAt,
    ),
    index("ai_usage_events_generation_id_idx").on(table.generationId),
    index("ai_usage_events_assistant_run_id_idx").on(table.assistantRunId),
  ],
);

export const workspaceCredits = pgTable("workspace_credits", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(5_000),
  reservedCredits: integer("reserved_credits").notNull().default(0),
  lifetimeUsed: integer("lifetime_used").notNull().default(0),
  lowCreditThreshold: integer("low_credit_threshold").notNull().default(500),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const aiCreditReservations = pgTable(
  "ai_credit_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id"),
    operation: text("operation").notNull(),
    credits: integer("credits").notNull(),
    status: text("status")
      .$type<"active" | "settled" | "released">()
      .notNull()
      .default("active"),
    usageEventId: uuid("usage_event_id").references(() => aiUsageEvents.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ai_credit_reservations_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("ai_credit_reservations_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("ai_credit_reservations_expires_at_idx").on(table.expiresAt),
  ],
);

/** Immutable credit transactions, including usage debits and future grants. */
export const usageLedger = pgTable(
  "usage_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    generationId: uuid("generation_id").references(() => generations.id, {
      onDelete: "set null",
    }),
    usageEventId: uuid("usage_event_id").references(() => aiUsageEvents.id, {
      onDelete: "set null",
    }),
    creditsDelta: integer("credits_delta").notNull(),
    balanceAfter: integer("balance_after"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("usage_ledger_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("usage_ledger_usage_event_id_unique").on(table.usageEventId),
    index("usage_ledger_workspace_id_idx").on(table.workspaceId),
    index("usage_ledger_generation_id_idx").on(table.generationId),
  ],
);
