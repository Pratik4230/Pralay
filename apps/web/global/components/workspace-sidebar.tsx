"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
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

import { WorkspaceAvatar } from "@/features/workspace/components/workspace-avatar";
import { useWorkspace } from "@/features/workspace/hooks/use-workspaces";
import { canManageWorkspace } from "@/features/workspace/utils/workspace-helpers";
import {
  buildWorkspaceNavItems,
  getWorkspaceIdFromPath,
  isNavItemActive,
  type WorkspaceNavItem,
} from "@/features/workspace/utils/workspace-nav";

function WorkspaceSwitcher({ workspaceId }: { workspaceId: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data, isLoading } = useWorkspace(workspaceId);

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        <WorkspaceAvatar
          name={data?.workspace.name ?? "Workspace"}
          avatarKey={data?.workspace.avatarKey}
          className="size-8"
        />
      </div>
    );
  }

  return (
    <div className="mx-2 flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
      <WorkspaceAvatar
        name={data?.workspace.name ?? "Workspace"}
        avatarKey={data?.workspace.avatarKey}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">
          {isLoading ? "Loading…" : (data?.workspace.name ?? "Workspace")}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {data?.workspace.description?.trim() ||
            data?.workspace.slug ||
            "Creative workspace"}
        </p>
      </div>
    </div>
  );
}

function ProPlanCard() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) return null;

  return (
    <div className="mx-2 mb-2 rounded-xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Pro Plan</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Soon
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Usage and credits tracking is coming soon.
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[46%] rounded-full bg-primary" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">2,340 / 5,000 credits</p>
      <Button type="button" size="sm" className="mt-3 w-full" disabled>
        Upgrade Plan
      </Button>
    </div>
  );
}

function WorkspaceNavMenu({
  items,
  pathname,
}: {
  items: WorkspaceNavItem[];
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.href}>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function WorkspaceSidebarSections() {
  const pathname = usePathname();
  const workspaceId = getWorkspaceIdFromPath(pathname);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data } = useWorkspace(workspaceId ?? "");

  if (!workspaceId) {
    return null;
  }

  const canManage = data ? canManageWorkspace(data.membership.role) : false;
  const { primary, secondary } = buildWorkspaceNavItems(workspaceId, {
    canManage,
  });

  return (
    <>
      <SidebarGroup className="px-0">
        <SidebarGroupContent className="space-y-2">
          {!collapsed ? (
            <Link
              href="/dashboard"
              className="mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5 shrink-0" />
              All workspaces
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className="mx-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="All workspaces"
                >
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">All workspaces</TooltipContent>
            </Tooltip>
          )}

          <WorkspaceSwitcher workspaceId={workspaceId} />
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupContent>
          <WorkspaceNavMenu items={primary} pathname={pathname} />
        </SidebarGroupContent>
      </SidebarGroup>

      {secondary.length > 0 ? (
        <>
          <SidebarSeparator className="mx-2" />
          <SidebarGroup>
            {!collapsed ? (
              <SidebarGroupLabel className="px-4 text-[11px] uppercase tracking-wider text-muted-foreground/80">
                Workspace
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <WorkspaceNavMenu items={secondary} pathname={pathname} />
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </>
  );
}

export function WorkspaceSidebarFooter() {
  return <ProPlanCard />;
}
