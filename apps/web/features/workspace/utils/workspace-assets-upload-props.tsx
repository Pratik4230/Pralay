"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { WorkspaceAssetsUploadPanelsProps } from "@/features/workspace/components/workspace-assets-upload-panels";
import { getWorkspaceBasePath } from "@/features/workspace/utils/workspace-nav";

const WORKSPACE_LIBRARY_DESCRIPTION =
  "Upload shared references for the whole workspace: faces, logos, team photos, and reusable poses.";

export function workspaceLibraryUploadPanelProps(
  workspaceId: string,
): WorkspaceAssetsUploadPanelsProps {
  return {
    workspaceId,
    includeProject: false,
    workspacePanelTitle: "Library",
    workspacePanelDescription: WORKSPACE_LIBRARY_DESCRIPTION,
    workspaceEmptyMessage:
      "Your uploaded assets will appear below the drop zone.",
    workspaceListLabel: "Shared workspace assets",
  };
}

function workspaceLibraryLinkDescription(
  workspaceId: string,
  prefix: string,
): ReactNode {
  const workspaceBasePath = getWorkspaceBasePath(workspaceId);
  return (
    <>
      {prefix}{" "}
      <Link
        href={`${workspaceBasePath}/library`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Library
      </Link>
      .
    </>
  );
}

export function projectAssetsUploadPanelProps(input: {
  workspaceId: string;
  projectId: string;
  projectName: string;
}): WorkspaceAssetsUploadPanelsProps {
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    includeProject: true,
    includeWorkspace: true,
    workspaceReadOnly: true,
    projectPanelTitle: `${input.projectName} assets`,
    projectPanelDescription:
      "Upload images that belong only to this project: posters, event photos, campaign creatives.",
    projectEmptyMessage:
      "Upload project-specific images here. They won't appear in the shared workspace library.",
    workspacePanelTitle: "Workspace library",
    workspacePanelDescription: workspaceLibraryLinkDescription(
      input.workspaceId,
      "Shared references for the whole workspace: faces, logos, team photos. Manage uploads in",
    ),
    workspaceEmptyMessage:
      "No shared workspace assets yet. Upload universal references from the workspace library.",
    workspaceListLabel: "Shared workspace assets",
  };
}

export function projectAssetsUploadDialogPanelProps(input: {
  workspaceId: string;
  projectId: string;
  projectName: string;
}): WorkspaceAssetsUploadPanelsProps {
  return {
    ...projectAssetsUploadPanelProps(input),
    workspaceReadOnly: false,
    workspacePanelDescription: workspaceLibraryLinkDescription(
      input.workspaceId,
      "Shared references for the whole workspace. Manage workspace uploads in",
    ),
  };
}
