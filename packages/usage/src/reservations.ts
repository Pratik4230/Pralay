import { and, eq, gt, lte, sql } from "drizzle-orm";

import { db } from "@repo/db";
import { aiCreditReservations, workspaceCredits } from "@repo/db/schema";

import { InsufficientCreditsError } from "./errors.js";

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
    .select({ id: aiCreditReservations.id, credits: aiCreditReservations.credits })
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

  const released = expired.reduce((sum, item) => sum + item.credits, 0);
  await tx
    .update(aiCreditReservations)
    .set({ status: "released", updatedAt: now })
    .where(
      and(
        eq(aiCreditReservations.workspaceId, workspaceId),
        eq(aiCreditReservations.status, "active"),
        lte(aiCreditReservations.expiresAt, now),
      ),
    );
  await tx
    .update(workspaceCredits)
    .set({
      reservedCredits: sql`greatest(0, ${workspaceCredits.reservedCredits} - ${released})`,
      updatedAt: now,
    })
    .where(eq(workspaceCredits.workspaceId, workspaceId));
}

export async function reserveAiCredits(input: ReserveAiCreditsInput) {
  const credits = Math.max(0, Math.ceil(input.credits));
  if (credits === 0) return { duplicate: false, reservation: null };
  const now = new Date();
  const expiresAt = input.expiresAt ?? new Date(now.getTime() + DEFAULT_RESERVATION_TTL_MS);

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
    await tx
      .update(aiCreditReservations)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(aiCreditReservations.id, reservation.id));
    return true;
  });
}

export type { ReserveAiCreditsInput };
