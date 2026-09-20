"use client";

import Link from "next/link";
import {
  FolderIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import { ProjectCoverBanner } from "@/features/workspace/components/project/project-cover-banner";
import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";

type ProjectOverviewPageProps = {
  workspaceId: string;
  projectId: string;
};

export function ProjectOverviewPage({
  workspaceId,
  projectId,
}: ProjectOverviewPageProps) {
  const { data, isLoading, error } = useWorkspaceProject(
    workspaceId,
    projectId,
  );
  const basePath = getProjectBasePath(workspaceId, projectId);

  if (isLoading) {
    return (
      <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
        Loading project…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-10 sm:px-6">
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

  const quickActions = [
    {
      title: "Create Thumbnail",
      description: "YouTube-ready layouts",
      icon: SparklesIcon,
      highlighted: true,
      href: `${basePath}/create`,
    },
    {
      title: "Generate Image",
      description: "Prompt-based creation",
      icon: SparklesIcon,
      href: `${basePath}/create`,
    },
    {
      title: "Edit Image",
      description: "Upscale, remove BG, expand",
      icon: PencilIcon,
      href: `${basePath}/create`,
    },
    {
      title: "Browse Assets",
      description: "Uploads and generations",
      icon: FolderIcon,
      href: `${basePath}/assets`,
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <section className="relative overflow-hidden border-b border-border/60">
        <ProjectCoverBanner
          workspaceId={workspaceId}
          projectId={projectId}
          name={project.name}
          coverKey={project.coverKey}
          variant="hero"
        />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-5xl items-end gap-4 px-4 pb-6 sm:px-6">
            <div className="min-w-0 flex-1 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {project.name}
                </h1>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm",
                    project.status === "active"
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-amber-500/20 text-amber-100",
                  )}
                >
                  {project.status}
                </span>
              </div>
              {project.description ? (
                <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
                  {project.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-2xl border border-border/60 bg-secondary/20 px-5 py-6 dark:bg-secondary/10">
          <p className="text-sm font-medium text-primary">Ready to create</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            What do you want to make in this project?
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors",
                    action.highlighted
                      ? "border-primary/30 bg-primary/5 hover:border-primary/40 hover:bg-primary/10"
                      : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      action.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
