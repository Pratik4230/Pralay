import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@repo/db";
import { aiUsageEvents, workspaceCredits } from "@repo/db/schema";

import { requireWorkspaceMembership } from "../../workspace/services/workspace-access.service.js";

export async function getWorkspaceUsageSummary(
  actorUserId: string,
  workspaceId: string,
  days: number,
) {
  await requireWorkspaceMembership(actorUserId, workspaceId);

  await db
    .insert(workspaceCredits)
    .values({ workspaceId })
    .onConflictDoNothing({ target: workspaceCredits.workspaceId });

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
  const [creditRows, totalRows, modalityRows, recentRows] = await Promise.all([
    db
      .select({
        balance: workspaceCredits.balance,
        lifetimeUsed: workspaceCredits.lifetimeUsed,
      })
      .from(workspaceCredits)
      .where(eq(workspaceCredits.workspaceId, workspaceId))
      .limit(1),
    db
      .select({
        operations: sql<number>`count(*)::int`,
        failedOperations: sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'failed')::int`,
        creditsUsed: sql<number>`coalesce(sum(${aiUsageEvents.creditsCharged}), 0)::int`,
        providerCostMicros: sql<number>`coalesce(sum(${aiUsageEvents.providerCostMicros}), 0)::int`,
        inputTokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)::int`,
      })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.workspaceId, workspaceId),
          gte(aiUsageEvents.createdAt, since),
        ),
      ),
    db
      .select({
        modality: aiUsageEvents.modality,
        operations: sql<number>`count(*)::int`,
        creditsUsed: sql<number>`coalesce(sum(${aiUsageEvents.creditsCharged}), 0)::int`,
      })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.workspaceId, workspaceId),
          gte(aiUsageEvents.createdAt, since),
        ),
      )
      .groupBy(aiUsageEvents.modality)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        id: aiUsageEvents.id,
        operation: aiUsageEvents.operation,
        modality: aiUsageEvents.modality,
        provider: aiUsageEvents.provider,
        model: aiUsageEvents.model,
        status: aiUsageEvents.status,
        creditsCharged: aiUsageEvents.creditsCharged,
        latencyMs: aiUsageEvents.latencyMs,
        createdAt: aiUsageEvents.createdAt,
      })
      .from(aiUsageEvents)
      .where(eq(aiUsageEvents.workspaceId, workspaceId))
      .orderBy(desc(aiUsageEvents.createdAt))
      .limit(20),
  ]);

  const credits = creditRows[0];
  const totals = totalRows[0];
  if (!credits || !totals)
    throw new Error("Workspace usage summary is unavailable");

  return {
    periodDays: days,
    credits,
    totals,
    byModality: modalityRows,
    recentEvents: recentRows.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
