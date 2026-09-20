import {
  FolderKanbanIcon,
  ImagesIcon,
  LayoutGridIcon,
  MailIcon,
  SettingsIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";

import type { SidebarNavItem } from "@/global/components/app-sidebar";

export type WorkspaceNavItem = SidebarNavItem & {
  adminOnly?: boolean;
};

const WORKSPACE_PATH = /^\/dashboard\/workspaces\/([^/]+)/;

export function getWorkspaceIdFromPath(pathname: string): string | null {
  const match = WORKSPACE_PATH.exec(pathname);
  return match?.[1] ?? null;
}

export function isWorkspaceRoute(pathname: string): boolean {
  return WORKSPACE_PATH.test(pathname);
}

export function getWorkspaceBasePath(workspaceId: string) {
  return `/dashboard/workspaces/${workspaceId}`;
}

export function buildWorkspaceNavItems(
  workspaceId: string,
  options: { canManage: boolean },
): {
  primary: WorkspaceNavItem[];
  secondary: WorkspaceNavItem[];
} {
  const base = getWorkspaceBasePath(workspaceId);

  const primary: WorkspaceNavItem[] = [
    {
      label: "Overview",
      href: base,
      icon: LayoutGridIcon,
      exact: true,
    },
    {
      label: "Projects",
      href: `${base}/projects`,
      icon: FolderKanbanIcon,
    },
    {
      label: "Library",
      href: `${base}/library`,
      icon: ImagesIcon,
    },
  ];

  const secondary: WorkspaceNavItem[] = [
    {
      label: "Members",
      href: `${base}/members`,
      icon: UsersIcon,
    },
    {
      label: "Invites",
      href: `${base}/invites`,
      icon: MailIcon,
      adminOnly: true,
    },
    {
      label: "Settings",
      href: `${base}/settings`,
      icon: SettingsIcon,
      adminOnly: true,
    },
    {
      label: "Trash",
      href: `${base}/trash`,
      icon: Trash2Icon,
      adminOnly: true,
    },
  ];

  return {
    primary,
    secondary: options.canManage
      ? secondary
      : secondary.filter((item) => !item.adminOnly),
  };
}

export function isNavItemActive(pathname: string, item: SidebarNavItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
