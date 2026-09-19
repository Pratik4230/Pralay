"use client";

import { useState } from "react";
import { toast } from "sonner";

import { timeAgo } from "@/global/utils/time-ago";

import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import type { TrashedItem } from "@repo/validators";

import {
  usePermanentlyDeleteProjectItem,
  useProjectTrash,
  useRestoreProjectItem,
} from "@/features/workspace/hooks/use-trash";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";

// ─── Single row ───────────────────────────────────────────────────────────────

function TrashedGenerationRow({
  item,
  workspaceId,
  projectId,
}: {
  item: TrashedItem;
  workspaceId: string;
  projectId: string;
}) {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const restore = useRestoreProjectItem(workspaceId, projectId);
  const purge = usePermanentlyDeleteProjectItem(workspaceId, projectId);

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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold uppercase text-muted-foreground">
          Gn
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{item.name}</p>
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
              restore.mutate(item.id, {
                onSuccess: () => toast.success(`"${item.name}" restored`),
                onError: (e) => toast.error(e.message),
              });
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
        description="This generation will be permanently deleted and its output files removed from storage. This cannot be undone."
        confirmLabel="Delete forever"
        isLoading={purge.isPending}
        onConfirm={() =>
          purge.mutate(item.id, {
            onSuccess: () => {
              toast.success(`"${item.name}" permanently deleted`);
              setConfirmPurge(false);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function ProjectTrashPanel({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { data, isLoading, error } = useProjectTrash(workspaceId, projectId);
  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading project trash…</p>
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
        <CardTitle className="text-base">Project Trash</CardTitle>
        <CardDescription>
          Deleted generations are permanently removed after 29 days. Their
          output files are also deleted from storage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deleted generations.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <TrashedGenerationRow
                key={item.id}
                item={item}
                workspaceId={workspaceId}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
