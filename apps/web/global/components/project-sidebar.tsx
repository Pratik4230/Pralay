"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

import { useWorkspaceProject } from "@/features/workspace/hooks/use-workspace-projects";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";
import {
  buildProjectNavItems,
  getProjectBasePath,
  getProjectIdsFromPath,
  type ProjectNavItem,
} from "@/features/workspace/utils/project-nav";
import { isNavItemActive } from "@/features/workspace/utils/workspace-nav";
import { getMediaUrl } from "@/global/utils/media-url";

function ProjectSwitcher({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data, isLoading } = useWorkspaceProject(workspaceId, projectId);
  const project = data?.project;
  const coverUrl = getMediaUrl(project?.coverKey ?? null);

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        <div className="relative size-8 overflow-hidden rounded-lg bg-muted">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill unoptimized className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary/10 text-[10px] font-bold text-primary">
              {project?.name?.slice(0, 2).toUpperCase() ?? "P"}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
        {coverUrl ? (
          <Image src={coverUrl} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary/10 text-xs font-bold text-primary">
            {project?.name
              ?.split(" ")
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("") ?? "P"}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          {isLoading ? "Loading…" : (project?.name ?? "Project")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {project?.description?.trim() || "Campaign project"}
        </p>
      </div>
    </div>
  );
}

function ProjectNavMenu({
  items,
  pathname,
}: {
  items: ProjectNavItem[];
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = !item.disabled && isNavItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.href}>
            <Tooltip>
              <TooltipTrigger asChild>
                {item.disabled ? (
                  <SidebarMenuButton disabled className="rounded-lg opacity-60">
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "rounded-lg transition-colors",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium",
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.disabled ? `${item.label} (coming soon)` : item.label}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function ProjectCreateCard({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) return null;

  const createHref = `${getProjectBasePath(workspaceId, projectId)}/create`;

  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-xl bg-foreground text-background p-4 relative">
      <div className="pointer-events-none absolute -right-4 -bottom-4 size-20 rounded-full bg-primary/70 blur-2xl" />
      <p className="relative text-sm font-semibold leading-tight">
        Create
        <br />
        in this project
      </p>
      <p className="relative mt-1 text-xs opacity-60 leading-relaxed">
        Generate and edit visuals for this campaign.
      </p>
      <Link
        href={createHref}
        className="relative mt-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        aria-label="Open create"
      >
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  );
}

export function ProjectSidebarSections() {
  const pathname = usePathname();
  const ids = getProjectIdsFromPath(pathname);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const workspaceQuery = useWorkspace(ids?.workspaceId ?? "");
  const canManage = workspaceQuery.data
    ? canManageWorkspace(workspaceQuery.data.membership.role)
    : false;

  if (!ids) {
    return null;
  }

  const { workspaceId, projectId } = ids;
  const projectsHref = `/dashboard/workspaces/${workspaceId}/projects`;
  const { primary, secondary } = buildProjectNavItems(workspaceId, projectId, {
    canManage,
  });

  return (
    <>
      <SidebarGroup className="px-0">
        <SidebarGroupContent className="space-y-2">
          {!collapsed ? (
            <Link
              href={projectsHref}
              className="mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5 shrink-0" />
              All projects
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={projectsHref}
                  className="mx-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="All projects"
                >
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">All projects</TooltipContent>
            </Tooltip>
          )}

          <ProjectSwitcher workspaceId={workspaceId} projectId={projectId} />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupContent>
          <ProjectNavMenu items={primary} pathname={pathname} />
        </SidebarGroupContent>
      </SidebarGroup>

      {secondary.length > 0 ? (
        <>
          <SidebarSeparator className="mx-2" />
          <SidebarGroup>
            {!collapsed ? (
              <SidebarGroupLabel className="px-4 text-[11px] uppercase tracking-wider text-muted-foreground/80">
                Project
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <ProjectNavMenu items={secondary} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </>
  );
}

export function ProjectSidebarFooter({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  return (
    <ProjectCreateCard workspaceId={workspaceId} projectId={projectId} />
  );
}
