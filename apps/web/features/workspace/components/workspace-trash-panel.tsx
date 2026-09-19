"use client";

import { useState } from "react";
import { toast } from "sonner";

import { timeAgo } from "@/global/utils/time-ago";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import type { TrashedItem, TrashedItemType } from "@repo/validators";

import {
  usePermanentlyDeleteWorkspaceItem,
  useRestoreWorkspaceItem,
  useWorkspaceTrash,
} from "@/features/workspace/hooks/use-trash";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TrashedItemType, string> = {
  project: "Project",
  asset: "Asset",
  collection: "Collection",
  template: "Template",
  generation: "Generation",
};

const TYPE_FILTERS: Array<{ value: TrashedItemType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "project", label: "Projects" },
  { value: "asset", label: "Assets" },
  { value: "collection", label: "Collections" },
  { value: "template", label: "Templates" },
  { value: "generation", label: "Generations" },
];

// ─── Single row ───────────────────────────────────────────────────────────────

function TrashedItemRow({
  item,
  workspaceId,
}: {
  item: TrashedItem;
  workspaceId: string;
}) {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const restore = useRestoreWorkspaceItem(workspaceId);
  const purge = usePermanentlyDeleteWorkspaceItem(workspaceId);

  const deletedAgo = timeAgo(item.deletedAt);
  const urgencyClass =
    item.daysRemaining <= 3
      ? "text-destructive"
      : item.daysRemaining <= 7
        ? "text-orange-500"
        : "text-muted-foreground";

  return (
    <>
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
        {/* icon / thumbnail placeholder */}
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground">
          {TYPE_LABELS[item.type].slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium leading-tight">{item.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {TYPE_LABELS[item.type]}
            </Badge>
          </div>
          {item.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.description}
            </p>
          ) : null}
          <p className={`mt-1 text-xs ${urgencyClass}`}>
            Deleted {deletedAgo} · {item.daysRemaining} day
            {item.daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={restore.isPending || purge.isPending}
            onClick={() => {
              restore.mutate(
                { type: item.type, itemId: item.id },
                {
                  onSuccess: () => toast.success(`"${item.name}" restored`),
                  onError: (e) => toast.error(e.message),
                },
              );
            }}
          >
            Restore
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={restore.isPending || purge.isPending}
            onClick={() => setConfirmPurge(true)}
          >
            Delete forever
          </Button>
        </div>
      </div>

      <ConfirmAlertDialog
        open={confirmPurge}
        onOpenChange={setConfirmPurge}
        title={`Permanently delete "${item.name}"?`}
        description={`This ${TYPE_LABELS[item.type].toLowerCase()} will be permanently deleted and cannot be recovered.`}
        confirmLabel="Delete forever"
        isLoading={purge.isPending}
        onConfirm={() =>
          purge.mutate(
            { type: item.type, itemId: item.id },
            {
              onSuccess: () => {
                toast.success(`"${item.name}" permanently deleted`);
                setConfirmPurge(false);
              },
              onError: (e) => toast.error(e.message),
            },
          )
        }
      />
    </>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function WorkspaceTrashPanel({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [filter, setFilter] = useState<TrashedItemType | "all">("all");
  const { data, isLoading, error } = useWorkspaceTrash(workspaceId);

  const items = (data?.items ?? []).filter(
    (i) => filter === "all" || i.type === filter,
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading workspace trash…</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load trash: {error.message}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workspace Trash</CardTitle>
        <CardDescription>
          Deleted projects, assets, collections, and templates are permanently
          removed after 29 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              className="h-7 px-3 text-xs"
              onClick={() => setFilter(value as TrashedItemType | "all")}
            >
              {label}
              {value !== "all" && data
                ? ` (${data.items.filter((i) => i.type === value).length})`
                : ""}
            </Button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "No items in trash."
              : `No deleted ${TYPE_LABELS[filter as TrashedItemType].toLowerCase()}s.`}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <TrashedItemRow
                key={`${item.type}-${item.id}`}
                item={item}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
