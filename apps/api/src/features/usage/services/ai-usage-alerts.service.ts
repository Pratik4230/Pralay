import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@repo/db";
import {
  notifications,
  projectAiBudgets,
  projects,
  user,
  workspaceCredits,
  workspaceMembers,
  workspaces,
} from "@repo/db/schema";
import { getEmailSender } from "@repo/email";

export type AiUsageAlert = {
  workspaceId: string;
  kind:
    | "low_credit"
    | "project_budget"
    | "failure_rate"
    | "latency"
    | "spend_spike";
  severity: "warning" | "critical";
  title: string;
  body: string;
  dedupeKey: string;
  metadata: Record<string, string | number | boolean | null>;
};

function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function utcMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export async function scanAiUsageAlerts(): Promise<AiUsageAlert[]> {
  const alerts: AiUsageAlert[] = [];
  const [lowCreditRows, projectBudgetRows, anomalyRows] = await Promise.all([
    db
      .select({
        workspaceId: workspaceCredits.workspaceId,
        workspaceName: workspaces.name,
        balance: workspaceCredits.balance,
        reserved: workspaceCredits.reservedCredits,
        threshold: workspaceCredits.lowCreditThreshold,
      })
      .from(workspaceCredits)
      .innerJoin(workspaces, eq(workspaceCredits.workspaceId, workspaces.id))
      .where(
        sql`${workspaceCredits.balance} - ${workspaceCredits.reservedCredits} <= ${workspaceCredits.lowCreditThreshold}`,
      ),
    db
      .select({
        workspaceId: projectAiBudgets.workspaceId,
        projectId: projectAiBudgets.projectId,
        projectName: projects.name,
        monthlyLimit: projectAiBudgets.monthlyLimit,
        periodUsed: projectAiBudgets.periodUsed,
        reserved: projectAiBudgets.reservedCredits,
      })
      .from(projectAiBudgets)
      .innerJoin(projects, eq(projectAiBudgets.projectId, projects.id))
      .where(
        and(
          isNotNull(projectAiBudgets.monthlyLimit),
          sql`${projectAiBudgets.periodUsed} + ${projectAiBudgets.reservedCredits} >= ${projectAiBudgets.monthlyLimit} * 0.8`,
        ),
      ),
    db.execute<{
      workspace_id: string;
      operations: number;
      failures: number;
      average_latency_ms: number | null;
      current_credits: number;
      baseline_hourly_credits: number;
    }>(sql`
      select
        workspace_id,
        count(*) filter (where created_at >= now() - interval '1 hour')::int as operations,
        count(*) filter (
          where created_at >= now() - interval '1 hour' and status = 'failed'
        )::int as failures,
        avg(latency_ms) filter (
          where created_at >= now() - interval '1 hour' and latency_ms is not null
        )::float as average_latency_ms,
        coalesce(sum(credits_charged) filter (
          where created_at >= now() - interval '1 hour'
        ), 0)::int as current_credits,
        (coalesce(sum(credits_charged) filter (
          where created_at >= now() - interval '25 hours'
            and created_at < now() - interval '1 hour'
        ), 0) / 24.0)::float as baseline_hourly_credits
      from ai_usage_events
      where created_at >= now() - interval '25 hours'
      group by workspace_id
    `),
  ]);

  for (const row of lowCreditRows) {
    const available = Math.max(0, row.balance - row.reserved);
    alerts.push({
      workspaceId: row.workspaceId,
      kind: "low_credit",
      severity: available === 0 ? "critical" : "warning",
      title:
        available === 0 ? "AI credits exhausted" : "AI credits are running low",
      body: `${row.workspaceName} has ${available.toLocaleString()} available AI credits remaining.`,
      dedupeKey: `ai-budget-low:${row.workspaceId}:${utcDay()}`,
      metadata: { available, threshold: row.threshold },
    });
  }

  for (const row of projectBudgetRows) {
    const limit = row.monthlyLimit!;
    const consumed = row.periodUsed + row.reserved;
    const exhausted = consumed >= limit;
    alerts.push({
      workspaceId: row.workspaceId,
      kind: "project_budget",
      severity: exhausted ? "critical" : "warning",
      title: exhausted
        ? "Project AI budget reached"
        : "Project AI budget is nearly used",
      body: `${row.projectName} has used or reserved ${consumed.toLocaleString()} of ${limit.toLocaleString()} monthly credits.`,
      dedupeKey: `ai-project-budget:${row.projectId}:${exhausted ? "100" : "80"}:${utcMonth()}`,
      metadata: { projectId: row.projectId, consumed, monthlyLimit: limit },
    });
  }

  const hourBucket = new Date().toISOString().slice(0, 13);
  for (const row of anomalyRows) {
    if (row.operations >= 5 && row.failures / row.operations >= 0.25) {
      alerts.push({
        workspaceId: row.workspace_id,
        kind: "failure_rate",
        severity: "critical",
        title: "AI failure rate is elevated",
        body: `${row.failures} of ${row.operations} AI operations failed in the last hour.`,
        dedupeKey: `ai-failure-rate:${row.workspace_id}:${hourBucket}`,
        metadata: { operations: row.operations, failures: row.failures },
      });
    }
    if (row.operations >= 5 && (row.average_latency_ms ?? 0) >= 15_000) {
      alerts.push({
        workspaceId: row.workspace_id,
        kind: "latency",
        severity: "warning",
        title: "AI latency is elevated",
        body: `Average provider latency was ${Math.round(row.average_latency_ms!).toLocaleString()} ms in the last hour.`,
        dedupeKey: `ai-latency:${row.workspace_id}:${hourBucket}`,
        metadata: { averageLatencyMs: Math.round(row.average_latency_ms!) },
      });
    }
    const spikeThreshold = Math.max(100, row.baseline_hourly_credits * 3);
    if (row.current_credits >= spikeThreshold) {
      alerts.push({
        workspaceId: row.workspace_id,
        kind: "spend_spike",
        severity: "warning",
        title: "AI credit usage spiked",
        body: `${row.current_credits.toLocaleString()} credits were used in the last hour, above the recent hourly baseline.`,
        dedupeKey: `ai-spend-spike:${row.workspace_id}:${hourBucket}`,
        metadata: {
          currentCredits: row.current_credits,
          baselineHourlyCredits: Math.round(row.baseline_hourly_credits),
        },
      });
    }
  }

  return alerts;
}

export async function createAiUsageAlertNotifications(alert: AiUsageAlert) {
  const recipients = await db
    .select({ userId: user.id, email: user.email })
    .from(workspaceMembers)
    .innerJoin(user, eq(workspaceMembers.userId, user.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, alert.workspaceId),
        inArray(workspaceMembers.role, ["owner", "admin"]),
      ),
    );

  const created: Array<{ id: string; email: string }> = [];
  for (const recipient of recipients) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: recipient.userId,
        workspaceId: alert.workspaceId,
        dedupeKey: `${alert.dedupeKey}:${recipient.userId}`,
        type:
          alert.kind === "low_credit" || alert.kind === "project_budget"
            ? "ai_budget"
            : "ai_anomaly",
        title: alert.title,
        body: alert.body,
        metadata: {
          ...alert.metadata,
          kind: alert.kind,
          severity: alert.severity,
          href: `/dashboard/workspaces/${alert.workspaceId}/usage`,
        },
      })
      .onConflictDoNothing({ target: notifications.dedupeKey })
      .returning({ id: notifications.id });
    if (notification)
      created.push({ id: notification.id, email: recipient.email });
  }
  return created;
}

export async function sendAiUsageAlertEmail(
  recipient: { email: string },
  alert: AiUsageAlert,
) {
  await getEmailSender()({
    to: recipient.email,
    subject: `[Pralay] ${alert.title}`,
    text: [
      alert.body,
      "",
      "Open the AI usage dashboard to review details and budget settings.",
    ].join("\n"),
  });
}
