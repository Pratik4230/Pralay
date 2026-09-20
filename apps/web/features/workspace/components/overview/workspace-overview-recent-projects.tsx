"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@repo/ui/components/button";

import { OverviewProjectCard, OverviewProjectCardSkeleton } from "@/features/workspace/components/overview/workspace-overview-project-card";
import { WorkspaceOverviewSectionHeader } from "@/features/workspace/components/overview/workspace-overview-section-header";
import { useWorkspaceProjects } from "@/features/workspace/hooks/use-workspace-projects";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";

const RECENT_PROJECT_LIMIT = 4;

export function WorkspaceOverviewRecentProjects({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const basePath = getWorkspaceBasePath(workspaceId);
  const { data, isLoading, error } = useWorkspaceProjects(workspaceId, "active");

  const recentProjects = useMemo(() => {
    if (!data?.projects) return [];

    return [...data.projects]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, RECENT_PROJECT_LIMIT);
  }, [data?.projects]);

  return (
    <section className="space-y-4">
      <WorkspaceOverviewSectionHeader
        title="Recent projects"
        description="Continue where you left off across active campaigns."
        href={`${basePath}/projects`}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: RECENT_PROJECT_LIMIT }).map((_, index) => (
            <OverviewProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      {!isLoading && !error && recentProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-secondary/20 px-5 py-8 text-center dark:bg-secondary/10">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project to organize thumbnails, assets, and campaign work.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href={`${basePath}/projects`}>Create project</Link>
          </Button>
        </div>
      ) : null}

      {!isLoading && !error && recentProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recentProjects.map((project) => (
            <OverviewProjectCard
              key={project.id}
              project={project}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
