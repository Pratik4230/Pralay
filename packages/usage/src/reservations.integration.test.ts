import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "@repo/db";
import {
  aiCreditReservations,
  aiUsageEvents,
  projectAiBudgets,
  projects,
  usageLedger,
  workspaceCredits,
  workspaces,
} from "@repo/db/schema";

import {
  InsufficientCreditsError,
  ProjectBudgetExceededError,
} from "./errors.js";
import { recordAiUsage } from "./record-usage.js";
import { reserveAiCredits } from "./reservations.js";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const createdWorkspaceIds: string[] = [];

describe.skipIf(!hasDatabaseUrl)("AI credit reservations", () => {
  afterEach(async () => {
    for (const workspaceId of createdWorkspaceIds.splice(0)) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
  });

  test("prevents overspend and settles a reservation exactly once", async () => {
    const suffix = randomUUID();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Usage test", slug: `usage-test-${suffix}` })
      .returning({ id: workspaces.id });
    createdWorkspaceIds.push(workspace!.id);
    await db.insert(workspaceCredits).values({
      workspaceId: workspace!.id,
      balance: 5,
      lowCreditThreshold: 1,
    });

    const reservationKey = `test-reservation:${suffix}`;
    await reserveAiCredits({
      idempotencyKey: reservationKey,
      workspaceId: workspace!.id,
      operation: "text.chat",
      credits: 4,
    });

    await expect(
      reserveAiCredits({
        idempotencyKey: `test-over-budget:${suffix}`,
        workspaceId: workspace!.id,
        operation: "image.generate",
        credits: 2,
      }),
    ).rejects.toBeInstanceOf(InsufficientCreditsError);

    const usageInput = {
      idempotencyKey: `test-usage:${suffix}`,
      workspaceId: workspace!.id,
      operation: "text.chat",
      modality: "text" as const,
      provider: "test",
      model: "test-model",
      inputTokens: 2_000,
      outputTokens: 10,
      startedAt: new Date(),
      reservationKey,
    };
    const first = await recordAiUsage(usageInput);
    const duplicate = await recordAiUsage(usageInput);

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);

    const [account] = await db
      .select()
      .from(workspaceCredits)
      .where(eq(workspaceCredits.workspaceId, workspace!.id));
    expect(account).toMatchObject({
      balance: 2,
      reservedCredits: 0,
      lifetimeUsed: 3,
    });

    const events = await db
      .select()
      .from(aiUsageEvents)
      .where(eq(aiUsageEvents.workspaceId, workspace!.id));
    const ledger = await db
      .select()
      .from(usageLedger)
      .where(eq(usageLedger.workspaceId, workspace!.id));
    const reservations = await db
      .select()
      .from(aiCreditReservations)
      .where(eq(aiCreditReservations.workspaceId, workspace!.id));

    expect(events).toHaveLength(1);
    expect(ledger).toHaveLength(1);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]?.status).toBe("settled");
  });

  test("allows only one concurrent reservation to claim the same credits", async () => {
    const suffix = randomUUID();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Concurrency test", slug: `usage-race-${suffix}` })
      .returning({ id: workspaces.id });
    createdWorkspaceIds.push(workspace!.id);
    await db.insert(workspaceCredits).values({
      workspaceId: workspace!.id,
      balance: 5,
    });

    const attempts = await Promise.allSettled([
      reserveAiCredits({
        idempotencyKey: `race-a:${suffix}`,
        workspaceId: workspace!.id,
        operation: "image.generate",
        credits: 4,
      }),
      reserveAiCredits({
        idempotencyKey: `race-b:${suffix}`,
        workspaceId: workspace!.id,
        operation: "image.generate",
        credits: 4,
      }),
    ]);

    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const [account] = await db
      .select()
      .from(workspaceCredits)
      .where(eq(workspaceCredits.workspaceId, workspace!.id));
    expect(account?.reservedCredits).toBe(4);
    expect(account!.balance - account!.reservedCredits).toBe(1);
  });

  test("enforces and settles a project monthly budget under concurrency", async () => {
    const suffix = randomUUID();
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Project budget test", slug: `project-budget-${suffix}` })
      .returning({ id: workspaces.id });
    createdWorkspaceIds.push(workspace!.id);
    const [project] = await db
      .insert(projects)
      .values({
        workspaceId: workspace!.id,
        name: "Budgeted project",
        slug: `budgeted-${suffix}`,
        createdBy: `test-user-${suffix}`,
      })
      .returning({ id: projects.id });
    await db.insert(workspaceCredits).values({
      workspaceId: workspace!.id,
      balance: 100,
    });
    await db.insert(projectAiBudgets).values({
      projectId: project!.id,
      workspaceId: workspace!.id,
      monthlyLimit: 5,
      periodStart: new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      ),
    });

    const attempts = await Promise.allSettled([
      reserveAiCredits({
        idempotencyKey: `project-race-a:${suffix}`,
        workspaceId: workspace!.id,
        projectId: project!.id,
        operation: "text.chat",
        credits: 4,
      }),
      reserveAiCredits({
        idempotencyKey: `project-race-b:${suffix}`,
        workspaceId: workspace!.id,
        projectId: project!.id,
        operation: "text.chat",
        credits: 4,
      }),
    ]);

    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = attempts.find((result) => result.status === "rejected");
    expect(
      rejected?.status === "rejected" ? rejected.reason : null,
    ).toBeInstanceOf(ProjectBudgetExceededError);

    const activeReservation = await db
      .select()
      .from(aiCreditReservations)
      .where(eq(aiCreditReservations.projectId, project!.id));
    expect(activeReservation).toHaveLength(1);
    await recordAiUsage({
      idempotencyKey: `project-usage:${suffix}`,
      reservationKey: activeReservation[0]!.idempotencyKey,
      workspaceId: workspace!.id,
      projectId: project!.id,
      operation: "text.chat",
      modality: "text",
      provider: "test",
      model: "test-model",
      inputTokens: 2_000,
      outputTokens: 10,
      startedAt: new Date(),
    });

    const [budget] = await db
      .select()
      .from(projectAiBudgets)
      .where(eq(projectAiBudgets.projectId, project!.id));
    expect(budget).toMatchObject({ periodUsed: 3, reservedCredits: 0 });
  });
});
