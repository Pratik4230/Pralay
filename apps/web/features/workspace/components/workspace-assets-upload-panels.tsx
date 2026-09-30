"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { WorkspaceAssetsPanel } from "@/features/workspace/components/workspace-assets-panel";
import { getProjectBasePath } from "@/features/workspace/utils/project-nav";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";

export type WorkspaceAssetsUploadPanelsProps = {
  workspaceId: string;
  projectId?: string;
  /** Project panel (requires projectId). Default: true when projectId is set. */
  includeProject?: boolean;
  /** Workspace library panel. Default: true. */
  includeWorkspace?: boolean;
  workspaceReadOnly?: boolean;
  projectPanelTitle?: string;
  projectPanelDescription?: string;
  projectEmptyMessage?: string;
  workspacePanelTitle?: string;
  workspacePanelDescription?: ReactNode;
  workspaceEmptyMessage?: string;
  workspaceListLabel?: string;
};

const DEFAULT_PROJECT_DESCRIPTION =
  "Upload images that belong only to this project.";
const DEFAULT_WORKSPACE_DESCRIPTION =
  "Shared references for the whole workspace.";
const DEFAULT_PROJECT_EMPTY =
  "Upload project-specific images here.";
const DEFAULT_WORKSPACE_EMPTY =
  "Upload shared references for use across projects.";

export function WorkspaceAssetsUploadPanels({
  workspaceId,
  projectId,
  includeProject = Boolean(projectId),
  includeWorkspace = true,
  workspaceReadOnly = false,
  projectPanelTitle = "Project assets",
  projectPanelDescription = DEFAULT_PROJECT_DESCRIPTION,
  projectEmptyMessage = DEFAULT_PROJECT_EMPTY,
  workspacePanelTitle = "Workspace library",
  workspacePanelDescription = DEFAULT_WORKSPACE_DESCRIPTION,
  workspaceEmptyMessage = DEFAULT_WORKSPACE_EMPTY,
  workspaceListLabel = "Workspace",
}: WorkspaceAssetsUploadPanelsProps) {
  const showProject = includeProject && projectId;

  return (
    <div className="flex flex-col gap-8">
      {showProject ? (
        <WorkspaceAssetsPanel
          workspaceId={workspaceId}
          scope="project"
          projectId={projectId}
          title={projectPanelTitle}
          description={projectPanelDescription}
          emptyMessage={projectEmptyMessage}
          listLabel="This project"
        />
      ) : null}
      {includeWorkspace ? (
        <WorkspaceAssetsPanel
          workspaceId={workspaceId}
          scope="workspace"
          readOnly={workspaceReadOnly}
          title={workspacePanelTitle}
          description={workspacePanelDescription}
          emptyMessage={workspaceEmptyMessage}
          listLabel={workspaceListLabel}
        />
      ) : null}
    </div>
  );
}

export function workspaceLibraryPageHref(workspaceId: string): string {
  return `${getWorkspaceBasePath(workspaceId)}/library`;
}

export function workspaceAssetsPageHref(
  workspaceId: string,
  projectId?: string,
): string | undefined {
  if (!projectId) return undefined;
  return `${getProjectBasePath(workspaceId, projectId)}/assets`;
}

type WorkspaceAssetsUploadDialogFooterProps = {
  href: string;
  label?: string;
};

export function WorkspaceAssetsUploadDialogFooter({
  href,
  label = "Open full page",
}: WorkspaceAssetsUploadDialogFooterProps) {
  return (
    <div className="shrink-0 border-t border-border/60 px-6 py-3">
      <Link
        href={href}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {label}
      </Link>
    </div>
  );
}
