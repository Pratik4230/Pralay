"use client";

import Link from "next/link";

import { Button } from "@repo/ui/components/button";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";

type ProjectAssetsPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectAssetsPage({
  workspaceId,
  projectId,
}: ProjectAssetsPageProps) {
  const { data, isLoading, error } = useWorkspaceProject(
    workspaceId,
    projectId,
  );

  if (isLoading) {
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
  const workspaceBasePath = getWorkspaceBasePath(workspaceId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Project-specific assets for {projectName}, plus shared workspace
          references you can reuse across campaigns.
        </p>
      </div>

      <WorkspaceAssetsPanel
        workspaceId={workspaceId}
        scope="project"
        projectId={projectId}
        title={`${projectName} assets`}
        description="Upload images that belong only to this project: posters, event photos, campaign creatives."
        emptyMessage="Upload project-specific images here. They won't appear in the shared workspace library."
        listLabel="This project"
      />

      <WorkspaceAssetsPanel
        workspaceId={workspaceId}
        scope="workspace"
        readOnly
        title="Workspace library"
        description={
          <>
            Shared references for the whole workspace: faces, logos, team photos.
            Manage uploads in{" "}
            <Link
              href={`${workspaceBasePath}/library`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Library
            </Link>
            .
          </>
        }
        emptyMessage="No shared workspace assets yet. Upload universal references from the workspace library."
        listLabel="Shared workspace assets"
      />
    </div>
  );
}
