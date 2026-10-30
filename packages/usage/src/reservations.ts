import { and, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiCreditReservations,
  projectAiBudgets,
  workspaceCredits,
} from "@repo/db/schema";

import {
  InsufficientCreditsError,
  ProjectBudgetExceededError,
} from "./errors.js";

const DEFAULT_RESERVATION_TTL_MS = 2 * 60 * 60 * 1_000;

type ReserveAiCreditsInput = {
  idempotencyKey: string;
  workspaceId: string;
  projectId?: string | null;
  userId?: string | null;
  operation: string;
  credits: number;
  expiresAt?: Date;
};

async function releaseExpiredReservations(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
  now: Date,
) {
  const expired = await tx
    .select({
      id: aiCreditReservations.id,
      credits: aiCreditReservations.credits,
      projectId: aiCreditReservations.projectId,
    })
    .from(aiCreditReservations)
    .where(
      and(
        eq(aiCreditReservations.workspaceId, workspaceId),
        eq(aiCreditReservations.status, "active"),
        lte(aiCreditReservations.expiresAt, now),
      ),
    )
    .for("update");
  if (expired.length === 0) return;

  await releaseReservationRows(tx, workspaceId, expired, now);
}

async function releaseReservationRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string,
  rows: Array<{ id: string; credits: number; projectId: string | null }>,
  now: Date,
) {
  if (rows.length === 0) return;

  const released = rows.reduce((sum, item) => sum + item.credits, 0);
  await tx
    .update(aiCreditReservations)
    .set({ status: "released", updatedAt: now })
    .where(
      inArray(
        aiCreditReservations.id,
        rows.map((item) => item.id),
      ),
    );
  await tx
    .update(workspaceCredits)
    .set({
      reservedCredits: sql`greatest(0, ${workspaceCredits.reservedCredits} - ${released})`,
      updatedAt: now,
    })
    .where(eq(workspaceCredits.workspaceId, workspaceId));

  const projectReleases = new Map<string, number>();
  for (const row of rows) {
    if (!row.projectId) continue;
    projectReleases.set(
      row.projectId,
      (projectReleases.get(row.projectId) ?? 0) + row.credits,
    );
  }
  for (const [projectId, projectCredits] of projectReleases) {
    await tx
      .update(projectAiBudgets)
      .set({
        reservedCredits: sql`greatest(0, ${projectAiBudgets.reservedCredits} - ${projectCredits})`,
        updatedAt: now,
      })
      .where(eq(projectAiBudgets.projectId, projectId));
  }
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

async function reserveProjectBudget(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  workspaceId: string,
  credits: number,
  now: Date,
) {
  const periodStart = startOfUtcMonth(now);
  await tx
    .update(projectAiBudgets)
    .set({
      periodStart,
      periodUsed: 0,
      reservedCredits: 0,
      updatedAt: now,
    })
    .where(
      and(
        eq(projectAiBudgets.projectId, projectId),
        eq(projectAiBudgets.workspaceId, workspaceId),
        lt(projectAiBudgets.periodStart, periodStart),
      ),
    );

  const [budget] = await tx
    .select()
    .from(projectAiBudgets)
    .where(
      and(
        eq(projectAiBudgets.projectId, projectId),
        eq(projectAiBudgets.workspaceId, workspaceId),
      ),
    )
    .limit(1)
    .for("update");
  if (!budget || budget.monthlyLimit === null) return;

  const [updated] = await tx
    .update(projectAiBudgets)
    .set({
      reservedCredits: sql`${projectAiBudgets.reservedCredits} + ${credits}`,
      updatedAt: now,
    })
    .where(
      and(
        eq(projectAiBudgets.projectId, projectId),
        sql`${projectAiBudgets.monthlyLimit} - ${projectAiBudgets.periodUsed} - ${projectAiBudgets.reservedCredits} >= ${credits}`,
      ),
    )
    .returning({ projectId: projectAiBudgets.projectId });
  if (!updated) {
    throw new ProjectBudgetExceededError(
      Math.max(
        0,
        budget.monthlyLimit - budget.periodUsed - budget.reservedCredits,
      ),
      credits,
    );
  }
}

export async function reserveAiCredits(input: ReserveAiCreditsInput) {
  const credits = Math.max(0, Math.ceil(input.credits));
  if (credits === 0) return { duplicate: false, reservation: null };
  const now = new Date();
  const expiresAt =
    input.expiresAt ?? new Date(now.getTime() + DEFAULT_RESERVATION_TTL_MS);

  return db.transaction(async (tx) => {
    await tx
      .insert(workspaceCredits)
      .values({ workspaceId: input.workspaceId })
      .onConflictDoNothing({ target: workspaceCredits.workspaceId });
    await releaseExpiredReservations(tx, input.workspaceId, now);

    const [existing] = await tx
      .select()
      .from(aiCreditReservations)
      .where(eq(aiCreditReservations.idempotencyKey, input.idempotencyKey))
      .limit(1)
      .for("update");
    if (existing?.status === "active" || existing?.status === "settled") {
      return { duplicate: true, reservation: existing };
    }

    const [account] = await tx
      .update(workspaceCredits)
      .set({
        reservedCredits: sql`${workspaceCredits.reservedCredits} + ${credits}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(workspaceCredits.workspaceId, input.workspaceId),
          sql`${workspaceCredits.balance} - ${workspaceCredits.reservedCredits} >= ${credits}`,
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
        Math.max(0, (current?.balance ?? 0) - (current?.reservedCredits ?? 0)),
        credits,
      );
    }

    if (input.projectId) {
      await reserveProjectBudget(
        tx,
        input.projectId,
        input.workspaceId,
        credits,
        now,
      );
    }

    if (existing?.status === "released") {
      const [reactivated] = await tx
        .update(aiCreditReservations)
        .set({ credits, status: "active", expiresAt, updatedAt: now })
        .where(eq(aiCreditReservations.id, existing.id))
        .returning();
      return { duplicate: false, reservation: reactivated! };
    }

    const [created] = await tx
      .insert(aiCreditReservations)
      .values({
        idempotencyKey: input.idempotencyKey,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
        userId: input.userId ?? null,
        operation: input.operation,
        credits,
        expiresAt,
      })
      .onConflictDoNothing({ target: aiCreditReservations.idempotencyKey })
      .returning();
    if (!created) {
      throw new Error("Credit reservation was created concurrently");
    }
    return { duplicate: false, reservation: created };
  });
}

export async function releaseAiCreditReservation(idempotencyKey: string) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select()
      .from(aiCreditReservations)
      .where(eq(aiCreditReservations.idempotencyKey, idempotencyKey))
      .limit(1)
      .for("update");
    if (!reservation || reservation.status !== "active") return false;

    await tx
      .update(workspaceCredits)
      .set({
        reservedCredits: sql`greatest(0, ${workspaceCredits.reservedCredits} - ${reservation.credits})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceCredits.workspaceId, reservation.workspaceId),
          gt(workspaceCredits.reservedCredits, 0),
        ),
      );
    if (reservation.projectId) {
      await tx
        .update(projectAiBudgets)
        .set({
          reservedCredits: sql`greatest(0, ${projectAiBudgets.reservedCredits} - ${reservation.credits})`,
          updatedAt: new Date(),
        })
        .where(eq(projectAiBudgets.projectId, reservation.projectId));
    }
    await tx
      .update(aiCreditReservations)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(aiCreditReservations.id, reservation.id));
    return true;
  });
}

export async function releaseExpiredAiCreditReservations(limit = 500) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const expired = await tx
      .select({
        id: aiCreditReservations.id,
        workspaceId: aiCreditReservations.workspaceId,
        projectId: aiCreditReservations.projectId,
        credits: aiCreditReservations.credits,
      })
      .from(aiCreditReservations)
      .where(
        and(
          eq(aiCreditReservations.status, "active"),
          lte(aiCreditReservations.expiresAt, now),
        ),
      )
      .limit(Math.max(1, Math.min(2_000, limit)))
      .for("update", { skipLocked: true });

    const byWorkspace = new Map<
      string,
      Array<{ id: string; credits: number; projectId: string | null }>
    >();
    for (const row of expired) {
      const rows = byWorkspace.get(row.workspaceId) ?? [];
      rows.push(row);
      byWorkspace.set(row.workspaceId, rows);
    }
    for (const [workspaceId, rows] of byWorkspace) {
      await releaseReservationRows(tx, workspaceId, rows, now);
    }
    return { released: expired.length };
  });
}

export type { ReserveAiCreditsInput };
