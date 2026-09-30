"use client";

import { useState } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";

import { WorkspaceAssetsUploadDialog } from "@/features/workspace/components/workspace-assets-upload-dialog";
import { WorkspaceAssetsUploadPanels } from "@/features/workspace/components/workspace-assets-upload-panels";
import { WorkspaceSectionShell } from "@/features/workspace/components/workspace-section-shell";
import { workspaceLibraryUploadPanelProps } from "@/features/workspace/utils/workspace-assets-upload-props";

export function WorkspaceLibraryPage({ workspaceId }: { workspaceId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const panelProps = workspaceLibraryUploadPanelProps(workspaceId);

  return (
    <>
      <WorkspaceSectionShell
        title="Library"
        description="Upload shared references for the whole workspace: faces, logos, team photos, and reusable poses."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <UploadIcon className="size-4" />
            Upload files
          </Button>
        }
      >
        <WorkspaceAssetsUploadPanels {...panelProps} />
      </WorkspaceSectionShell>

      <WorkspaceAssetsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload to library"
        description="Add shared references for your workspace. They will be available in Create with @ across all projects."
        showLibraryPageLink
        libraryPageLinkLabel="Open Library page"
        {...panelProps}
      />
    </>
  );
}
