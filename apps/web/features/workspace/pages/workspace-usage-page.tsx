"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CoinsIcon,
  GaugeIcon,
  LockKeyholeIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";

import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import {
  useUpdateWorkspaceUsageBudget,
  useWorkspaceUsage,
} from "@/features/workspace/hooks/use-workspace-usage";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

const PERIODS = [7, 30, 90] as const;

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatOperation(value: string) {
  return value.replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof GaugeIcon;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; label: string; operations: number; credits: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.credits));
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage in this period.</p>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={item.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatNumber(item.credits)} credits
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(3, (item.credits / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatNumber(item.operations)} operations
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function WorkspaceUsagePage({ workspaceId }: { workspaceId: string }) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const usage = useWorkspaceUsage(workspaceId, days);
  const workspace = useWorkspace(workspaceId);
  const updateBudget = useUpdateWorkspaceUsageBudget(workspaceId);
  const [threshold, setThreshold] = useState("500");

  useEffect(() => {
    if (usage.data) setThreshold(String(usage.data.credits.lowCreditThreshold));
  }, [usage.data]);

  const canManage = workspace.data
    ? canManageWorkspace(workspace.data.membership.role)
    : false;
  const maxDailyCredits = useMemo(
    () => Math.max(1, ...(usage.data?.daily.map((item) => item.creditsUsed) ?? [])),
    [usage.data],
  );

  if (usage.isLoading || workspace.isLoading) {
    return (
      <WorkspaceSectionShell title="AI usage">
        <p className="text-sm text-muted-foreground">Loading usage data...</p>
      </WorkspaceSectionShell>
    );
  }
  if (usage.error || !usage.data) {
    return (
      <WorkspaceSectionShell title="AI usage">
        <p className="text-sm text-destructive">
          {usage.error?.message ?? "Usage data is unavailable."}
        </p>
      </WorkspaceSectionShell>
    );
  }

  const data = usage.data;
  const failureRate =
    data.totals.operations > 0
      ? Math.round((data.totals.failedOperations / data.totals.operations) * 100)
      : 0;

  return (
    <WorkspaceSectionShell
      title="AI usage"
      description="Monitor every AI operation and protect the workspace with credit limits."
      action={
        <div className="flex rounded-lg border border-border/60 bg-background p-1">
          {PERIODS.map((period) => (
            <Button
              key={period}
              type="button"
              size="sm"
              variant={days === period ? "secondary" : "ghost"}
              onClick={() => setDays(period)}
            >
              {period} days
            </Button>
          ))}
        </div>
      }
    >
      {data.credits.isLow ? (
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">AI credits are running low</p>
            <p className="mt-1 text-muted-foreground">
              New provider operations are blocked automatically when available credits are insufficient.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Available credits"
          value={formatNumber(data.credits.available)}
          detail={`${formatNumber(data.credits.reserved)} reserved for active jobs`}
          icon={CoinsIcon}
        />
        <MetricCard
          label={`Credits used in ${days} days`}
          value={formatNumber(data.totals.creditsUsed)}
          detail={`${formatNumber(data.credits.lifetimeUsed)} lifetime credits used`}
          icon={GaugeIcon}
        />
        <MetricCard
          label="AI operations"
          value={formatNumber(data.totals.operations)}
          detail={`${formatNumber(data.totals.inputTokens + data.totals.outputTokens)} total tokens`}
          icon={ActivityIcon}
        />
        <MetricCard
          label="Failed operations"
          value={formatNumber(data.totals.failedOperations)}
          detail={`${failureRate}% failure rate`}
          icon={AlertTriangleIcon}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Daily credit usage</CardTitle>
          <CardDescription>Successful billable operations during the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No billable usage in this period.</p>
          ) : (
            <div className="flex h-44 items-end gap-2 overflow-x-auto border-b border-border/60 pb-2">
              {data.daily.map((item) => (
                <div key={item.date} className="flex min-w-10 flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.creditsUsed}</span>
                  <div
                    className="w-full max-w-12 rounded-t bg-primary/80"
                    style={{ height: `${Math.max(4, (item.creditsUsed / maxDailyCredits) * 112)}px` }}
                    title={`${item.date}: ${item.creditsUsed} credits`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {item.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList
          title="By modality"
          items={data.byModality.map((item) => ({
            key: item.modality,
            label: formatOperation(item.modality),
            operations: item.operations,
            credits: item.creditsUsed,
          }))}
        />
        <BreakdownList
          title="By model"
          items={data.byModel.map((item) => ({
            key: `${item.provider}:${item.model}`,
            label: `${item.model} (${item.provider})`,
            operations: item.operations,
            credits: item.creditsUsed,
          }))}
        />
        <BreakdownList
          title="By project"
          items={data.byProject.map((item) => ({
            key: item.projectId ?? "workspace",
            label: item.projectName,
            operations: item.operations,
            credits: item.creditsUsed,
          }))}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LockKeyholeIcon className="size-4" /> Budget enforcement
          </CardTitle>
          <CardDescription>
            Provider calls reserve credits first. Requests that cannot reserve enough credits never reach the provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium">
              Low-credit warning threshold
              <Input
                className="mt-2"
                type="number"
                min={0}
                max={1_000_000}
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                disabled={!canManage || updateBudget.isPending}
              />
            </label>
            <Button
              type="button"
              disabled={!canManage || updateBudget.isPending}
              onClick={() => {
                const value = Number(threshold);
                if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
                  toast.error("Enter a threshold from 0 to 1,000,000 credits.");
                  return;
                }
                updateBudget.mutate(
                  { lowCreditThreshold: value },
                  {
                    onSuccess: () => toast.success("Budget alert updated"),
                    onError: (error) => toast.error(error.message),
                  },
                );
              }}
            >
              {updateBudget.isPending ? "Saving..." : "Save threshold"}
            </Button>
          </div>
          {!canManage ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Only workspace owners and admins can change budget alerts.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent operations</CardTitle>
          <CardDescription>Provider-neutral diagnostics for text, images, tools, and future modalities.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Operation</th>
                <th className="px-4 py-3 font-medium">Provider and model</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-muted/20">
                  <td className="px-6 py-3">
                    <p className="font-medium">{formatOperation(event.operation)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{event.model}</p>
                    <p className="text-xs text-muted-foreground">{event.provider}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatNumber((event.inputTokens ?? 0) + (event.outputTokens ?? 0))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {event.latencyMs === null ? "Not available" : `${event.latencyMs.toLocaleString()} ms`}
                  </td>
                  <td className="px-4 py-3 font-medium">{event.creditsCharged}</td>
                  <td className="px-6 py-3">
                    <Badge variant={event.status === "failed" ? "destructive" : "secondary"}>
                      {event.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Credit ledger</CardTitle>
          <CardDescription>
            Immutable debits created when provider usage is settled.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-6 py-3 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.recentLedger.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No credit transactions yet.
                  </td>
                </tr>
              ) : (
                data.recentLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/20">
                    <td className="px-6 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatOperation(entry.reason)}
                    </td>
                    <td className="px-4 py-3 text-destructive">
                      {entry.creditsDelta.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {entry.balanceAfter?.toLocaleString() ?? "Not available"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </WorkspaceSectionShell>
  );
}
