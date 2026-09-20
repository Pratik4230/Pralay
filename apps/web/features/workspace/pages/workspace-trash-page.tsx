"use client";

import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { WorkspaceTrashPanel } from "@/features/workspace/components/workspace-trash-panel";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

export function WorkspaceTrashPage({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, error } = useWorkspace(workspaceId);

  if (isLoading) {
    return (
      <WorkspaceSectionShell title="Trash">
        <p className="text-sm text-muted-foreground">Loading trash…</p>
      </WorkspaceSectionShell>
    );
  }

  if (error || !data) {
    return (
      <WorkspaceSectionShell title="Trash">
        <p className="text-sm text-destructive">
          {error?.message ?? "Workspace not found"}
        </p>
      </WorkspaceSectionShell>
    );
  }

  if (!canManageWorkspace(data.membership.role)) {
    return (
      <WorkspaceSectionShell title="Trash">
        <p className="text-sm text-muted-foreground">
          You do not have permission to view workspace trash.
        </p>
      </WorkspaceSectionShell>
    );
  }

  return (
    <WorkspaceSectionShell
      title="Trash"
      description="Restore or permanently delete soft-deleted workspace items."
    >
      <WorkspaceTrashPanel workspaceId={workspaceId} />
    </WorkspaceSectionShell>
  );
}
