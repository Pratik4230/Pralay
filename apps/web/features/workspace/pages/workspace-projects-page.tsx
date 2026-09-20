"use client";

import { WorkspaceProjectsPanel } from "@/features/workspace/components/workspace-projects-panel";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";

export function WorkspaceProjectsPage({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading, error } = useWorkspace(workspaceId);

  if (isLoading) {
    return (
      <WorkspaceSectionShell title="Projects">
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      </WorkspaceSectionShell>
    );
  }

  if (error || !data) {
    return (
      <WorkspaceSectionShell title="Projects">
        <p className="text-sm text-destructive">
          {error?.message ?? "Workspace not found"}
        </p>
      </WorkspaceSectionShell>
    );
  }

  return (
    <WorkspaceSectionShell
      title="Projects"
      description="Organize campaign work, thumbnails, and creative batches."
    >
      <WorkspaceProjectsPanel
        workspaceId={workspaceId}
        role={data.membership.role}
      />
    </WorkspaceSectionShell>
  );
}
