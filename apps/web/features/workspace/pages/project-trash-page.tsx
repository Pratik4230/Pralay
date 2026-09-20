"use client";

import Link from "next/link";

import { Button } from "@repo/ui/components/button";

import { ProjectTrashPanel } from "@/features/workspace/components/project-trash-panel";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";

type ProjectTrashPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectTrashPage({
  workspaceId,
  projectId,
}: ProjectTrashPageProps) {
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
        <Button asChild variant="ghost" className="mb-4 w-fit px-0">
          <Link href={basePath}>← Back to overview</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleted items from {data.project.name}. Restore or permanently remove
          them here.
        </p>
      </div>

      <ProjectTrashPanel workspaceId={workspaceId} projectId={projectId} />
    </div>
  );
}
