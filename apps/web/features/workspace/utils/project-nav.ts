import {
  ImagesIcon,
  LayoutGridIcon,
  PlusCircleIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";

import type { SidebarNavItem } from "@/global/components/app-sidebar";

export type ProjectNavItem = SidebarNavItem & {
  adminOnly?: boolean;
  disabled?: boolean;
};

const PROJECT_PATH =
  /^\/dashboard\/workspaces\/([^/]+)\/projects\/([^/]+)/;

export function getProjectIdsFromPath(pathname: string): {
  workspaceId: string;
  projectId: string;
} | null {
  const match = PROJECT_PATH.exec(pathname);
  if (!match?.[1] || !match[2]) return null;

  return {
    workspaceId: match[1],
    projectId: match[2],
  };
}

export function isProjectRoute(pathname: string): boolean {
  return PROJECT_PATH.test(pathname);
}

export function getProjectBasePath(workspaceId: string, projectId: string) {
  return `/dashboard/workspaces/${workspaceId}/projects/${projectId}`;
}

export function buildProjectNavItems(
  workspaceId: string,
  projectId: string,
  options: { canManage: boolean },
): {
  primary: ProjectNavItem[];
  secondary: ProjectNavItem[];
} {
  const base = getProjectBasePath(workspaceId, projectId);

  const primary: ProjectNavItem[] = [
    {
      label: "Overview",
      href: base,
      icon: LayoutGridIcon,
      exact: true,
    },
    {
      label: "Create",
      href: `${base}/create`,
      icon: PlusCircleIcon,
    },
    {
      label: "Assets",
      href: `${base}/assets`,
      icon: ImagesIcon,
    },
  ];

  const secondary: ProjectNavItem[] = [
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
