import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiUsageEvents,
  projects,
  usageLedger,
  workspaceCredits,
} from "@repo/db/schema";

import {
  requireWorkspaceAdmin,
  requireWorkspaceMembership,
} from "../../workspace/services/workspace-access.service.js";

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
  const [
    creditRows,
    totalRows,
    modalityRows,
    providerRows,
    modelRows,
    projectRows,
    dailyRows,
    recentRows,
    ledgerRows,
  ] = await Promise.all([
    db
      .select({
        balance: workspaceCredits.balance,
        reserved: workspaceCredits.reservedCredits,
        lifetimeUsed: workspaceCredits.lifetimeUsed,
        lowCreditThreshold: workspaceCredits.lowCreditThreshold,
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
        provider: aiUsageEvents.provider,
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
      .groupBy(aiUsageEvents.provider)
      .orderBy(desc(sql`sum(${aiUsageEvents.creditsCharged})`)),
    db
      .select({
        provider: aiUsageEvents.provider,
        model: aiUsageEvents.model,
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
      .groupBy(aiUsageEvents.provider, aiUsageEvents.model)
      .orderBy(desc(sql`sum(${aiUsageEvents.creditsCharged})`)),
    db
      .select({
        projectId: aiUsageEvents.projectId,
        projectName: sql<string>`coalesce(${projects.name}, 'Workspace operations')`,
        operations: sql<number>`count(*)::int`,
        creditsUsed: sql<number>`coalesce(sum(${aiUsageEvents.creditsCharged}), 0)::int`,
      })
      .from(aiUsageEvents)
      .leftJoin(projects, eq(aiUsageEvents.projectId, projects.id))
      .where(
        and(
          eq(aiUsageEvents.workspaceId, workspaceId),
          gte(aiUsageEvents.createdAt, since),
        ),
      )
      .groupBy(aiUsageEvents.projectId, projects.name)
      .orderBy(desc(sql`sum(${aiUsageEvents.creditsCharged})`)),
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${aiUsageEvents.createdAt}), 'YYYY-MM-DD')`,
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
      .groupBy(sql`date_trunc('day', ${aiUsageEvents.createdAt})`)
      .orderBy(sql`date_trunc('day', ${aiUsageEvents.createdAt})`),
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
        inputTokens: aiUsageEvents.inputTokens,
        outputTokens: aiUsageEvents.outputTokens,
        providerRequestId: aiUsageEvents.providerRequestId,
        createdAt: aiUsageEvents.createdAt,
      })
      .from(aiUsageEvents)
      .where(eq(aiUsageEvents.workspaceId, workspaceId))
      .orderBy(desc(aiUsageEvents.createdAt))
      .limit(20),
    db
      .select({
        id: usageLedger.id,
        creditsDelta: usageLedger.creditsDelta,
        balanceAfter: usageLedger.balanceAfter,
        reason: usageLedger.reason,
        createdAt: usageLedger.createdAt,
      })
      .from(usageLedger)
      .where(eq(usageLedger.workspaceId, workspaceId))
      .orderBy(desc(usageLedger.createdAt))
      .limit(20),
  ]);

  const credits = creditRows[0];
  const totals = totalRows[0];
  if (!credits || !totals)
    throw new Error("Workspace usage summary is unavailable");

  return {
    periodDays: days,
    credits: {
      balance: credits.balance,
      reserved: credits.reserved,
      available: Math.max(0, credits.balance - credits.reserved),
      lifetimeUsed: credits.lifetimeUsed,
      lowCreditThreshold: credits.lowCreditThreshold,
      isLow:
        Math.max(0, credits.balance - credits.reserved) <=
        credits.lowCreditThreshold,
    },
    totals,
    byModality: modalityRows,
    byProvider: providerRows,
    byModel: modelRows,
    byProject: projectRows,
    daily: dailyRows,
    recentEvents: recentRows.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
    recentLedger: ledgerRows.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function updateWorkspaceUsageBudget(
  actorUserId: string,
  workspaceId: string,
  lowCreditThreshold: number,
) {
  await requireWorkspaceAdmin(actorUserId, workspaceId);
  await db
    .insert(workspaceCredits)
    .values({ workspaceId })
    .onConflictDoNothing({ target: workspaceCredits.workspaceId });
  const [updated] = await db
    .update(workspaceCredits)
    .set({ lowCreditThreshold, updatedAt: new Date() })
    .where(eq(workspaceCredits.workspaceId, workspaceId))
    .returning({ lowCreditThreshold: workspaceCredits.lowCreditThreshold });
  if (!updated) throw new Error("Workspace credit account was not found");
  return updated;
}
