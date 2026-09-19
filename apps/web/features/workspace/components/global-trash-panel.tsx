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
import type { TrashedWorkspace } from "@repo/validators";

import {
  useGlobalTrash,
  usePermanentlyDeleteGlobalWorkspace,
  useRestoreGlobalWorkspace,
} from "@/features/workspace/hooks/use-trash";
import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { ConfirmAlertDialog } from "@/global/components/confirm-alert-dialog";

// ─── Single row ───────────────────────────────────────────────────────────────

function TrashedWorkspaceRow({
  workspace,
}: {
  workspace: TrashedWorkspace;
}) {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const restore = useRestoreGlobalWorkspace();
  const purge = usePermanentlyDeleteGlobalWorkspace();

  const deletedAgo = timeAgo(workspace.deletedAt);
  const urgencyClass =
    workspace.daysRemaining <= 3
      ? "text-destructive"
      : workspace.daysRemaining <= 7
        ? "text-orange-500"
        : "text-muted-foreground";

  return (
    <>
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
        <WorkspaceAvatar
          name={workspace.name}
          avatarKey={workspace.avatarKey}
          className="size-10 shrink-0 text-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{workspace.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {workspace.slug}
          </p>
          <p className={`mt-1 text-xs ${urgencyClass}`}>
            Deleted {deletedAgo} · {workspace.daysRemaining} day
            {workspace.daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={restore.isPending || purge.isPending}
            onClick={() => {
              restore.mutate(workspace.id, {
                onSuccess: () => toast.success(`"${workspace.name}" restored`),
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
        title={`Permanently delete "${workspace.name}"?`}
        description="This workspace and all its data will be deleted permanently. This cannot be undone."
        confirmLabel="Delete forever"
        isLoading={purge.isPending}
        onConfirm={() =>
          purge.mutate(workspace.id, {
            onSuccess: () => {
              toast.success(`"${workspace.name}" permanently deleted`);
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

export function GlobalTrashPanel() {
  const { data, isLoading, error } = useGlobalTrash();
  const workspaces = data?.workspaces ?? [];

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading global trash…</p>
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
        <CardTitle className="text-base">Deleted Workspaces</CardTitle>
        <CardDescription>
          Deleted workspaces are permanently removed after 29 days. Only you (as
          owner) can restore or permanently delete them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deleted workspaces.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {workspaces.map((ws) => (
              <TrashedWorkspaceRow key={ws.id} workspace={ws} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
