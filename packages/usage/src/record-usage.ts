import { and, eq, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiUsageEvents,
  aiCreditReservations,
  type AiUsageMetrics,
  type AiUsageModality,
  type AiUsageStatus,
  usageLedger,
  projectAiBudgets,
  workspaceCredits,
} from "@repo/db/schema";

import { AI_CREDIT_POLICY_VERSION, calculateUsageCredits } from "./credits.js";
import { InsufficientCreditsError } from "./errors.js";

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
  /** Stable key returned to the provider-facing operation before it starts. */
  reservationKey?: string | null;
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

    const [reservation] = input.reservationKey
      ? await tx
          .select()
          .from(aiCreditReservations)
          .where(eq(aiCreditReservations.idempotencyKey, input.reservationKey))
          .limit(1)
          .for("update")
      : [];

    if (credits > 0) {
      const reservedCredits =
        reservation?.status === "active" ? reservation.credits : 0;
      const [account] = await tx
        .update(workspaceCredits)
        .set({
          balance: sql`${workspaceCredits.balance} - ${credits}`,
          reservedCredits: sql`greatest(0, ${workspaceCredits.reservedCredits} - ${reservedCredits})`,
          lifetimeUsed: sql`${workspaceCredits.lifetimeUsed} + ${credits}`,
          updatedAt: completedAt,
        })
        .where(
          and(
            eq(workspaceCredits.workspaceId, input.workspaceId),
            reservation?.status === "active"
              ? sql`${workspaceCredits.balance} - ${workspaceCredits.reservedCredits} + ${reservedCredits} >= ${credits} and ${workspaceCredits.reservedCredits} >= ${reservedCredits}`
              : sql`${workspaceCredits.balance} - ${workspaceCredits.reservedCredits} >= ${credits}`,
          ),
        )
        .returning({
          balance: workspaceCredits.balance,
          reservedCredits: workspaceCredits.reservedCredits,
        });
      if (!account) {
        const [current] = await tx
          .select({
            balance: workspaceCredits.balance,
            reservedCredits: workspaceCredits.reservedCredits,
          })
          .from(workspaceCredits)
          .where(eq(workspaceCredits.workspaceId, input.workspaceId))
          .limit(1);
        throw new InsufficientCreditsError(
          Math.max(
            0,
            (current?.balance ?? 0) -
              (current?.reservedCredits ?? 0) +
              reservedCredits,
          ),
          credits,
        );
      }

      if (reservation?.status === "active") {
        if (reservation.projectId) {
          await tx
            .update(projectAiBudgets)
            .set({
              periodUsed: sql`${projectAiBudgets.periodUsed} + ${credits}`,
              reservedCredits: sql`greatest(0, ${projectAiBudgets.reservedCredits} - ${reservedCredits})`,
              updatedAt: completedAt,
            })
            .where(eq(projectAiBudgets.projectId, reservation.projectId));
        }
        await tx
          .update(aiCreditReservations)
          .set({
            status: "settled",
            usageEventId: created.id,
            updatedAt: completedAt,
          })
          .where(eq(aiCreditReservations.id, reservation.id));
      }

      if (!reservation && input.projectId) {
        await tx
          .update(projectAiBudgets)
          .set({
            periodUsed: sql`${projectAiBudgets.periodUsed} + ${credits}`,
            updatedAt: completedAt,
          })
          .where(eq(projectAiBudgets.projectId, input.projectId));
      }

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
    } else if (reservation?.status === "active") {
      await tx
        .update(workspaceCredits)
        .set({
          reservedCredits: sql`greatest(0, ${workspaceCredits.reservedCredits} - ${reservation.credits})`,
          updatedAt: completedAt,
        })
        .where(eq(workspaceCredits.workspaceId, input.workspaceId));
      if (reservation.projectId) {
        await tx
          .update(projectAiBudgets)
          .set({
            reservedCredits: sql`greatest(0, ${projectAiBudgets.reservedCredits} - ${reservation.credits})`,
            updatedAt: completedAt,
          })
          .where(eq(projectAiBudgets.projectId, reservation.projectId));
      }
      await tx
        .update(aiCreditReservations)
        .set({
          status: status === "failed" ? "released" : "settled",
          usageEventId: created.id,
          updatedAt: completedAt,
        })
        .where(eq(aiCreditReservations.id, reservation.id));
    }

    return { event: created, duplicate: false };
  });
}
