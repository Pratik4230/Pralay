import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { db } from "@repo/db";
import {
  notifications,
  usageLedger,
  user,
  workspaceCredits,
  workspaceMembers,
  workspaces,
} from "@repo/db/schema";

import {
  createAiUsageAlertNotifications,
  type AiUsageAlert,
} from "./ai-usage-alerts.service.js";
import { adjustWorkspaceCredits } from "./workspace-usage.service.js";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const createdWorkspaceIds: string[] = [];
const createdUserIds: string[] = [];

describe.skipIf(!hasDatabaseUrl)("AI usage administration", () => {
  afterEach(async () => {
    for (const workspaceId of createdWorkspaceIds.splice(0)) {
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    }
    for (const userId of createdUserIds.splice(0)) {
      await db.delete(user).where(eq(user.id, userId));
    }
  });

  async function createOwnerFixture() {
    const suffix = randomUUID();
    const userId = `usage-owner-${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Usage Owner",
      email: `usage-owner-${suffix}@example.com`,
    });
    createdUserIds.push(userId);
    const [workspace] = await db
      .insert(workspaces)
      .values({ name: "Usage admin test", slug: `usage-admin-${suffix}` })
      .returning({ id: workspaces.id });
    createdWorkspaceIds.push(workspace!.id);
    await db.insert(workspaceMembers).values({
      workspaceId: workspace!.id,
      userId,
      role: "owner",
    });
    return { suffix, userId, workspaceId: workspace!.id };
  }

  test("applies an owner credit adjustment exactly once", async () => {
    const fixture = await createOwnerFixture();
    await db.insert(workspaceCredits).values({
      workspaceId: fixture.workspaceId,
      balance: 100,
    });
    const input = {
      idempotencyKey: randomUUID(),
      creditsDelta: 25,
      reason: "Integration test credit grant",
    };

    const first = await adjustWorkspaceCredits(
      fixture.userId,
      fixture.workspaceId,
      input,
    );
    const duplicate = await adjustWorkspaceCredits(
      fixture.userId,
      fixture.workspaceId,
      input,
    );

    expect(first).toMatchObject({ duplicate: false, balance: 125 });
    expect(duplicate).toMatchObject({ duplicate: true, balance: 125 });
    const ledger = await db
      .select()
      .from(usageLedger)
      .where(eq(usageLedger.workspaceId, fixture.workspaceId));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      creditsDelta: 25,
      balanceAfter: 125,
      reason: "admin_adjustment",
      metadata: {
        reason: "Integration test credit grant",
        actorUserId: fixture.userId,
      },
    });
  });

  test("deduplicates budget alert notifications per recipient", async () => {
    const fixture = await createOwnerFixture();
    const alert: AiUsageAlert = {
      workspaceId: fixture.workspaceId,
      kind: "low_credit",
      severity: "warning",
      title: "AI credits are running low",
      body: "Only 50 AI credits remain.",
      dedupeKey: `test-low-credit:${fixture.suffix}`,
      metadata: { available: 50 },
    };

    const first = await createAiUsageAlertNotifications(alert);
    const duplicate = await createAiUsageAlertNotifications(alert);

    expect(first).toHaveLength(1);
    expect(duplicate).toHaveLength(0);
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.workspaceId, fixture.workspaceId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: fixture.userId,
      type: "ai_budget",
      title: alert.title,
    });
  });
});
