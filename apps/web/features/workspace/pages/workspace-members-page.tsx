"use client";

import { WorkspaceMembersPanel } from "@/features/workspace/components/workspace-members-panel";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { useMe } from "@/features/workspace/hooks/use-me";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";

export function WorkspaceMembersPage({ workspaceId }: { workspaceId: string }) {
  const meQuery = useMe();
  const workspaceQuery = useWorkspace(workspaceId);

  if (meQuery.isLoading || workspaceQuery.isLoading) {
    return (
      <WorkspaceSectionShell title="Members">
        <p className="text-sm text-muted-foreground">Loading members…</p>
      </WorkspaceSectionShell>
    );
  }

  if (workspaceQuery.error || !workspaceQuery.data || !meQuery.data) {
    return (
      <WorkspaceSectionShell title="Members">
        <p className="text-sm text-destructive">
          {workspaceQuery.error?.message ?? "Workspace not found"}
        </p>
      </WorkspaceSectionShell>
    );
  }

  return (
    <WorkspaceSectionShell
      title="Members"
      description="Manage who can access this workspace."
    >
      <WorkspaceMembersPanel
        workspaceId={workspaceId}
        role={workspaceQuery.data.membership.role}
        currentUserId={meQuery.data.user.id}
      />
    </WorkspaceSectionShell>
  );
}
