"use client";

import { WorkspaceInvitesPanel } from "@/features/workspace/components/workspace-invites-panel";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";

export function WorkspaceInvitesPage({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, error } = useWorkspace(workspaceId);

  if (isLoading) {
    return (
      <WorkspaceSectionShell title="Invites">
        <p className="text-sm text-muted-foreground">Loading invites…</p>
      </WorkspaceSectionShell>
    );
  }

  if (error || !data) {
    return (
      <WorkspaceSectionShell title="Invites">
        <p className="text-sm text-destructive">
          {error?.message ?? "Workspace not found"}
        </p>
      </WorkspaceSectionShell>
    );
  }

  if (!canManageWorkspace(data.membership.role)) {
    return (
      <WorkspaceSectionShell title="Invites">
        <p className="text-sm text-muted-foreground">
          You do not have permission to manage invites.
        </p>
      </WorkspaceSectionShell>
    );
  }

  return (
    <WorkspaceSectionShell
      title="Invites"
      description="Invite collaborators to this workspace."
    >
      <WorkspaceInvitesPanel
        workspaceId={workspaceId}
        role={data.membership.role}
      />
    </WorkspaceSectionShell>
  );
}
