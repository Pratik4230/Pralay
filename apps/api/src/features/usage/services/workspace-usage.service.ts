import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiUsageEvents,
  projectAiBudgets,
  projects,
  usageLedger,
  workspaceCredits,
} from "@repo/db/schema";

import {
  requireWorkspaceAdmin,
  requireWorkspaceMembership,
  requireWorkspaceOwner,
} from "../../workspace/services/workspace-access.service.js";
import { InsufficientCreditsError } from "@repo/usage";

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

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

  const monthStart = currentMonthStart();
  await db
    .update(projectAiBudgets)
    .set({
      periodStart: monthStart,
      periodUsed: 0,
      reservedCredits: 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectAiBudgets.workspaceId, workspaceId),
        lt(projectAiBudgets.periodStart, monthStart),
      ),
    );

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
        projectId: projects.id,
        projectName: projects.name,
        operations: sql<number>`count(${aiUsageEvents.id})::int`,
        creditsUsed: sql<number>`coalesce(sum(${aiUsageEvents.creditsCharged}), 0)::int`,
        monthlyLimit: projectAiBudgets.monthlyLimit,
        monthlyUsed: sql<number>`coalesce(${projectAiBudgets.periodUsed}, 0)::int`,
        reserved: sql<number>`coalesce(${projectAiBudgets.reservedCredits}, 0)::int`,
      })
      .from(projects)
      .leftJoin(
        aiUsageEvents,
        and(
          eq(aiUsageEvents.projectId, projects.id),
          gte(aiUsageEvents.createdAt, since),
        ),
      )
      .leftJoin(projectAiBudgets, eq(projectAiBudgets.projectId, projects.id))
      .where(
        and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)),
      )
      .groupBy(
        projects.id,
        projects.name,
        projectAiBudgets.monthlyLimit,
        projectAiBudgets.periodUsed,
        projectAiBudgets.reservedCredits,
      )
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
        metadata: usageLedger.metadata,
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
    byProject: projectRows.map((project) => ({
      ...project,
      monthlyAvailable:
        project.monthlyLimit === null
          ? null
          : Math.max(
              0,
              project.monthlyLimit - project.monthlyUsed - project.reserved,
            ),
    })),
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

export async function updateProjectAiBudget(
  actorUserId: string,
  workspaceId: string,
  projectId: string,
  monthlyLimit: number | null,
) {
  await requireWorkspaceAdmin(actorUserId, workspaceId);
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, workspaceId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);
  if (!project) throw new Error("Project not found");

  const [budget] = await db
    .insert(projectAiBudgets)
    .values({
      projectId,
      workspaceId,
      monthlyLimit,
      periodStart: currentMonthStart(),
    })
    .onConflictDoUpdate({
      target: projectAiBudgets.projectId,
      set: { monthlyLimit, updatedAt: new Date() },
    })
    .returning();
  if (!budget) throw new Error("Project AI budget was not updated");
  return {
    projectId,
    monthlyLimit: budget.monthlyLimit,
    monthlyUsed: budget.periodUsed,
    reserved: budget.reservedCredits,
    monthlyAvailable:
      budget.monthlyLimit === null
        ? null
        : Math.max(
            0,
            budget.monthlyLimit - budget.periodUsed - budget.reservedCredits,
          ),
  };
}

export async function adjustWorkspaceCredits(
  actorUserId: string,
  workspaceId: string,
  input: { idempotencyKey: string; creditsDelta: number; reason: string },
) {
  await requireWorkspaceOwner(actorUserId, workspaceId);
  return db.transaction(async (tx) => {
    await tx
      .insert(workspaceCredits)
      .values({ workspaceId })
      .onConflictDoNothing({ target: workspaceCredits.workspaceId });

    const ledgerKey = `admin-adjustment:${workspaceId}:${input.idempotencyKey}`;
    const [existing] = await tx
      .select()
      .from(usageLedger)
      .where(eq(usageLedger.idempotencyKey, ledgerKey))
      .limit(1);
    if (existing) {
      const [account] = await tx
        .select()
        .from(workspaceCredits)
        .where(eq(workspaceCredits.workspaceId, workspaceId))
        .limit(1);
      return {
        duplicate: true,
        balance: account!.balance,
        available: Math.max(0, account!.balance - account!.reservedCredits),
      };
    }

    const [ledger] = await tx
      .insert(usageLedger)
      .values({
        idempotencyKey: ledgerKey,
        workspaceId,
        userId: actorUserId,
        creditsDelta: input.creditsDelta,
        balanceAfter: null,
        reason: "admin_adjustment",
        metadata: { reason: input.reason, actorUserId },
      })
      .returning({ id: usageLedger.id });
    if (!ledger) throw new Error("Credit adjustment was not created");

    const [account] = await tx
      .update(workspaceCredits)
      .set({
        balance: sql`${workspaceCredits.balance} + ${input.creditsDelta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceCredits.workspaceId, workspaceId),
          input.creditsDelta < 0
            ? sql`${workspaceCredits.balance} - ${workspaceCredits.reservedCredits} >= ${Math.abs(input.creditsDelta)}`
            : sql`true`,
        ),
      )
      .returning({
        balance: workspaceCredits.balance,
        reservedCredits: workspaceCredits.reservedCredits,
      });
    if (!account) {
      const [current] = await tx
        .select()
        .from(workspaceCredits)
        .where(eq(workspaceCredits.workspaceId, workspaceId))
        .limit(1);
      throw new InsufficientCreditsError(
        Math.max(0, current!.balance - current!.reservedCredits),
        Math.abs(input.creditsDelta),
      );
    }

    await tx
      .update(usageLedger)
      .set({ balanceAfter: account.balance })
      .where(eq(usageLedger.id, ledger.id));
    return {
      duplicate: false,
      balance: account.balance,
      available: Math.max(0, account.balance - account.reservedCredits),
    };
  });
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
