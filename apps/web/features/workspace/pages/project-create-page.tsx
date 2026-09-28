"use client";

import { useMemo } from "react";

import { createCreateProjectComposer } from "@/features/create/components/create-project-composer";
import { CreateProjectRuntimeProvider } from "@/features/create/components/create-project-runtime-provider";
import { CreateThreadWelcome } from "@/features/create/components/create-thread-welcome";
import { CreateThreadSelector } from "@/features/create/components/create-thread-selector";
import { useProjectCreateUi } from "@/features/create/hooks/use-project-create-ui";
import { useInfiniteWorkspaceAssets } from "@/features/workspace/hooks/use-workspace-assets";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { Thread } from "@/global/components/assistant-ui/elements/thread.aui";

type ProjectCreatePageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectCreatePage({
  workspaceId,
  projectId,
}: ProjectCreatePageProps) {
  const projectQuery = useWorkspaceProject(workspaceId, projectId);

  useInfiniteWorkspaceAssets(workspaceId, {
    scope: "project",
    projectId,
    limit: 50,
  });
  useInfiniteWorkspaceAssets(workspaceId, { scope: "workspace", limit: 50 });

  const { hydrated, threadsLoading, threads, activeThreadId, createThread, selectThread } =
    useProjectCreateUi(workspaceId, projectId);

  const threadComponents = useMemo(
    () => ({
      Welcome: CreateThreadWelcome,
      Composer: createCreateProjectComposer(workspaceId, projectId),
    }),
    [workspaceId, projectId],
  );

  if (projectQuery.isLoading || !hydrated || threadsLoading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (projectQuery.error || !projectQuery.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        {projectQuery.error?.message ?? "Project not found"}
      </div>
    );
  }

  return (
    <CreateProjectRuntimeProvider
      workspaceId={workspaceId}
      projectId={projectId}
    >
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-background">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <CreateThreadSelector
            threads={threads}
            activeThreadId={activeThreadId}
            onSelect={selectThread}
            onCreate={createThread}
          />
          <p className="truncate text-xs text-muted-foreground">
            {projectQuery.data.project.name}
          </p>
        </header>

        <div className="min-h-0 flex-1">
          <Thread components={threadComponents} />
        </div>
      </div>
    </CreateProjectRuntimeProvider>
  );
}
