"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderIcon,
  ImageIcon,
  MoreHorizontalIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";

import { Button } from "@repo/ui/components/button";

import { WorkspaceOverviewRecentCreations } from "@/features/workspace/components/overview/workspace-overview-recent-creations";
import { WorkspaceOverviewRecentProjects } from "@/features/workspace/components/overview/workspace-overview-recent-projects";
import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { useMe } from "@/features/workspace/hooks/use-me";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";
import { getMediaUrl } from "@/global/utils/media-url";

type WorkspaceOverviewPageProps = {
  workspaceId: string;
};

function formatCreatedMonth(dateString: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getWorkspaceTags(description: string | null, slug: string) {
  const source = description?.trim() || slug;
  return source
    .split(/[,·|/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function WorkspaceOverviewPage({ workspaceId }: WorkspaceOverviewPageProps) {
  const router = useRouter();
  const workspaceQuery = useWorkspace(workspaceId);
  const meQuery = useMe();

  if (workspaceQuery.isLoading || meQuery.isLoading) {
    return (
      <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
        Loading workspace…
      </div>
    );
  }

  if (workspaceQuery.error || !workspaceQuery.data) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <p className="text-sm text-destructive">
          {workspaceQuery.error?.message ?? "Workspace not found"}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const { workspace, membership } = workspaceQuery.data;
  const basePath = getWorkspaceBasePath(workspaceId);
  const coverUrl = getMediaUrl(workspace.coverImageKey);
  const firstName = meQuery.data?.user.name.split(" ")[0] ?? "there";
  const canManage = canManageWorkspace(membership.role);
  const tags = getWorkspaceTags(workspace.description, workspace.slug);

  const stats = [
    {
      label: "Projects",
      value: workspace.stats.projectCount,
      icon: FolderIcon,
    },
    {
      label: "Assets",
      value: workspace.stats.assetCount,
      icon: ImageIcon,
    },
    {
      label: "Members",
      value: workspace.stats.memberCount,
      icon: UsersIcon,
    },
    {
      label: "Created",
      value: formatCreatedMonth(workspace.createdAt),
      icon: SparklesIcon,
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="relative h-56 w-full bg-linear-to-br from-stone-800 via-stone-700 to-zinc-900 sm:h-64">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/10" />

          {canManage ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute right-4 top-4 bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
              onClick={() => router.push(`${basePath}/settings`)}
            >
              Edit cover
            </Button>
          ) : null}

          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto flex max-w-7xl items-end gap-4 px-4 pb-6 sm:px-6">
              <WorkspaceAvatar
                name={workspace.name}
                avatarKey={workspace.avatarKey}
                className="size-16 border-2 border-background text-lg shadow-lg sm:size-20"
              />
              <div className="min-w-0 flex-1 pb-1 text-white">
                <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
                  {workspace.name}
                </h1>
                {tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/85 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
                  {workspace.description?.trim() || "Your creative workspace"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex min-w-30 items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5"
                >
                  <Icon className="size-3.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold leading-none">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {canManage ? (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`${basePath}/members`}>Invite members</Link>
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="Workspace options"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <section className="rounded-2xl border border-border/60 bg-secondary/20 px-5 py-6 dark:bg-secondary/10">
          <p className="text-sm font-medium text-primary">
            {getGreeting()}, {firstName}.
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Welcome back to {workspace.name}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Open a project to create thumbnails, images, and edits. Brand Kit
            and Templates will live here in a future release.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href={`${basePath}/projects`}>View all projects</Link>
          </Button>
        </section>

        <WorkspaceOverviewRecentProjects workspaceId={workspaceId} />
        <WorkspaceOverviewRecentCreations workspaceId={workspaceId} />
      </div>
    </div>
  );
}
