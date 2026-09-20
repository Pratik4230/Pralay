"use client";

import Link from "next/link";

import { Button } from "@repo/ui/components/button";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";

type ProjectAssetsPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectAssetsPage({
  workspaceId,
  projectId,
}: ProjectAssetsPageProps) {
  const basePath = getProjectBasePath(workspaceId, projectId);
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uploads and generations for {data.project.name}. Project-scoped
          filtering will arrive with Image Studio.
        </p>
      </div>

      <WorkspaceAssetsPanel workspaceId={workspaceId} />
    </div>
  );
}
