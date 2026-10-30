import { eq, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiUsageEvents,
  type AiUsageMetrics,
  type AiUsageModality,
  type AiUsageStatus,
  usageLedger,
  workspaceCredits,
} from "@repo/db/schema";

import { AI_CREDIT_POLICY_VERSION, calculateUsageCredits } from "./credits.js";

export type RecordAiUsageInput = {
  idempotencyKey: string;
  workspaceId: string;
  projectId?: string | null;
  userId?: string | null;
  assistantRunId?: string | null;
  generationId?: string | null;
  operation: string;
  modality: AiUsageModality;
  status?: AiUsageStatus;
  provider: string;
  model: string;
  metrics?: AiUsageMetrics;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
  reasoningTokens?: number | null;
  providerCostMicros?: number | null;
  credits?: number;
  latencyMs?: number | null;
  providerRequestId?: string | null;
  traceId?: string | null;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
};

export async function recordAiUsage(input: RecordAiUsageInput) {
  const status = input.status ?? "succeeded";
  const credits =
    status === "succeeded"
      ? Math.max(
          0,
          Math.ceil(
            input.credits ??
              calculateUsageCredits({
                modality: input.modality,
                metrics: input.metrics,
                inputTokens: input.inputTokens,
                outputTokens: input.outputTokens,
              }),
          ),
        )
      : 0;
  const completedAt = input.completedAt ?? new Date();

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(aiUsageEvents)
      .values({
        idempotencyKey: input.idempotencyKey,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        userId: input.userId ?? null,
        assistantRunId: input.assistantRunId ?? null,
        generationId: input.generationId ?? null,
        operation: input.operation,
        modality: input.modality,
        status,
        provider: input.provider,
        model: input.model,
        metrics: input.metrics ?? {},
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        cachedInputTokens: input.cachedInputTokens ?? null,
        reasoningTokens: input.reasoningTokens ?? null,
        providerCostMicros: input.providerCostMicros ?? null,
        creditsCharged: credits,
        latencyMs: input.latencyMs ?? null,
        providerRequestId: input.providerRequestId ?? null,
        traceId: input.traceId ?? null,
        errorCode: input.errorCode ?? null,
        metadata: {
          creditPolicyVersion: AI_CREDIT_POLICY_VERSION,
          ...(input.metadata ?? {}),
        },
        startedAt: input.startedAt,
        completedAt,
      })
      .onConflictDoNothing({ target: aiUsageEvents.idempotencyKey })
      .returning();

    if (!created) {
      const [existing] = await tx
        .select()
        .from(aiUsageEvents)
        .where(eq(aiUsageEvents.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (!existing)
        throw new Error("Usage idempotency conflict was not found");
      return { event: existing, duplicate: true };
    }

    await tx
      .insert(workspaceCredits)
      .values({ workspaceId: input.workspaceId })
      .onConflictDoNothing({ target: workspaceCredits.workspaceId });

    if (credits > 0) {
      const [account] = await tx
        .update(workspaceCredits)
        .set({
          balance: sql`${workspaceCredits.balance} - ${credits}`,
          lifetimeUsed: sql`${workspaceCredits.lifetimeUsed} + ${credits}`,
          updatedAt: completedAt,
        })
        .where(eq(workspaceCredits.workspaceId, input.workspaceId))
        .returning({ balance: workspaceCredits.balance });
      if (!account) throw new Error("Workspace credit account was not found");

      await tx
        .insert(usageLedger)
        .values({
          idempotencyKey: `usage:${input.idempotencyKey}`,
          workspaceId: input.workspaceId,
          userId: input.userId ?? null,
          generationId: input.generationId ?? null,
          usageEventId: created.id,
          creditsDelta: -credits,
          balanceAfter: account.balance,
          reason: input.operation,
        })
        .onConflictDoNothing({ target: usageLedger.idempotencyKey });
    }

    return { event: created, duplicate: false };
  });
}
