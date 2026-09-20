"use client";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";

export function WorkspaceLibraryPage({ workspaceId }: { workspaceId: string }) {
  return (
    <WorkspaceSectionShell
      title="Library"
      description="Upload shared references for the whole workspace: faces, logos, team photos, and reusable poses."
    >
      <WorkspaceAssetsPanel workspaceId={workspaceId} />
    </WorkspaceSectionShell>
  );
}
