"use client";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";

export function WorkspaceLibraryPage({ workspaceId }: { workspaceId: string }) {
  return (
    <WorkspaceSectionShell
      title="Library"
      description="Upload, organize, and reuse workspace assets."
    >
      <WorkspaceAssetsPanel workspaceId={workspaceId} />
    </WorkspaceSectionShell>
  );
}
