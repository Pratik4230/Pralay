"use client";

import Link from "next/link";

import { Button } from "@repo/ui/components/button";

import { ProjectSettingsForm } from "@/features/workspace/components/project/project-settings-form";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";

type ProjectSettingsPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectSettingsPage({
  workspaceId,
  projectId,
}: ProjectSettingsPageProps) {
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

  const { project } = data;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 w-fit px-0">
          <Link href={basePath}>← Back to overview</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage details and status for {project.name}.
        </p>
      </div>

      <ProjectSettingsForm
        workspaceId={workspaceId}
        projectId={projectId}
        initialName={project.name}
        initialDescription={project.description}
        initialStatus={project.status}
      />
    </div>
  );
}
