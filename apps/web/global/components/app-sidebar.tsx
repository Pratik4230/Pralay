"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  Trash2Icon,
  ArrowRightIcon,
} from "lucide-react";

import { cn } from "@repo/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@repo/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

import {
  getProjectIdsFromPath,
  isProjectRoute,
} from "@/features/workspace/utils/project-nav";
import { isWorkspaceRoute } from "@/features/workspace/utils/workspace-nav";
import {
  ProjectSidebarFooter,
  ProjectSidebarSections,
} from "@/global/components/project-sidebar";
import {
  WorkspaceSidebarFooter,
  WorkspaceSidebarSections,
} from "@/global/components/workspace-sidebar";

export type SidebarNavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  exact?: boolean;
};

type AppSidebarProps = {
  navItems: SidebarNavItem[];
};

function PralayLogo() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
        P
      </span>
      {!collapsed && (
        <span className="font-semibold tracking-tight text-foreground leading-none">
          Pralay
          <span className="text-primary">·</span>
        </span>
      )}
    </Link>
  );
}

function CreateCard() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  if (collapsed) return null;

  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-xl bg-foreground text-background p-4 relative">
      <div className="pointer-events-none absolute -right-4 -bottom-4 size-20 rounded-full bg-primary/70 blur-2xl" />
      <p className="relative text-sm font-semibold leading-tight">
        Create
        <br />
        Without Limits
      </p>
      <p className="relative mt-1 text-xs opacity-60 leading-relaxed">
        Turn ideas into extraordinary visuals.
      </p>
      <Link
        href="/dashboard"
        className="relative mt-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
        aria-label="Start creating"
      >
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </div>
  );
}

function DashboardSidebarSections({ navItems }: { navItems: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
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
                          "bg-foreground text-background hover:bg-foreground/90 hover:text-background font-medium",
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ navItems }: AppSidebarProps) {
  const pathname = usePathname();
  const inProject = isProjectRoute(pathname);
  const inWorkspace = !inProject && isWorkspaceRoute(pathname);
  const projectIds = inProject ? getProjectIdsFromPath(pathname) : null;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="pb-2 pt-3 px-3">
        <PralayLogo />
      </SidebarHeader>

      <SidebarContent>
        {inProject ? (
          <ProjectSidebarSections />
        ) : inWorkspace ? (
          <WorkspaceSidebarSections />
        ) : (
          <DashboardSidebarSections navItems={navItems} />
        )}
      </SidebarContent>

      {inProject && projectIds ? (
        <SidebarFooter className="pb-2">
          <ProjectSidebarFooter
            workspaceId={projectIds.workspaceId}
            projectId={projectIds.projectId}
          />
        </SidebarFooter>
      ) : inWorkspace ? (
        <SidebarFooter className="pb-2">
          <WorkspaceSidebarFooter />
        </SidebarFooter>
      ) : (
        <SidebarFooter className="pb-2">
          <CreateCard />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}

export const dashboardNavItems: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    label: "Global Trash",
    href: "/dashboard/trash",
    icon: Trash2Icon,
  },
];
