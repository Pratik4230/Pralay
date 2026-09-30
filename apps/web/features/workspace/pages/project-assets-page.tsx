"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UploadIcon } from "lucide-react";

import { Button } from "@repo/ui/components/button";

import { WorkspaceAssetsUploadDialog } from "@/features/workspace/components/workspace-assets-upload-dialog";
import { WorkspaceAssetsUploadPanels } from "@/features/workspace/components/workspace-assets-upload-panels";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import {
  projectAssetsUploadDialogPanelProps,
  projectAssetsUploadPanelProps,
} from "@/features/workspace/utils/workspace-assets-upload-props";

type ProjectAssetsPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectAssetsPage({
  workspaceId,
  projectId,
}: ProjectAssetsPageProps) {
  const [mounted, setMounted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data, isLoading, error } = useWorkspaceProject(
    workspaceId,
    projectId,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
        Loading project…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Project not found"}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={`/dashboard/workspaces/${workspaceId}/projects`}>
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const projectName = data.project.name;
  const inlinePanelProps = projectAssetsUploadPanelProps({
    workspaceId,
    projectId,
    projectName,
  });
  const dialogPanelProps = projectAssetsUploadDialogPanelProps({
    workspaceId,
    projectId,
    projectName,
  });

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Project-specific assets for {projectName}, plus shared workspace
              references you can reuse across campaigns.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setUploadOpen(true)}
          >
            <UploadIcon className="size-4" />
            Upload files
          </Button>
        </div>

        <WorkspaceAssetsUploadPanels {...inlinePanelProps} />
      </div>

      <WorkspaceAssetsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload files"
        description={`Add images for ${projectName} or the shared workspace library.`}
        showAssetsPageLink
        {...dialogPanelProps}
      />
    </>
  );
}
