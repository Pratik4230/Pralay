"use client";

import type { ReactNode } from "react";

import {
  workspaceAssetsPageHref,
  workspaceLibraryPageHref,
  WorkspaceAssetsUploadDialogFooter,
  WorkspaceAssetsUploadPanels,
  type WorkspaceAssetsUploadPanelsProps,
} from "@/features/workspace/components/workspace-assets-upload-panels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";

export type WorkspaceAssetsUploadDialogProps = WorkspaceAssetsUploadPanelsProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: ReactNode;
  footer?: ReactNode;
  /** Footer link to project Assets page (requires projectId). */
  showAssetsPageLink?: boolean;
  assetsPageLinkLabel?: string;
  /** Footer link to workspace Library page. */
  showLibraryPageLink?: boolean;
  libraryPageLinkLabel?: string;
};

const DEFAULT_TITLE = "Upload to library";
const DEFAULT_DESCRIPTION =
  "Add images to your project or workspace library.";

export function WorkspaceAssetsUploadDialog({
  open,
  onOpenChange,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  footer,
  showAssetsPageLink = false,
  assetsPageLinkLabel = "Open full Assets page",
  showLibraryPageLink = false,
  libraryPageLinkLabel = "Open Library page",
  workspaceId,
  projectId,
  ...panelProps
}: WorkspaceAssetsUploadDialogProps) {
  let defaultFooter: ReactNode = null;
  if (showAssetsPageLink && projectId) {
    const href = workspaceAssetsPageHref(workspaceId, projectId);
    if (href) {
      defaultFooter = (
        <WorkspaceAssetsUploadDialogFooter
          href={href}
          label={assetsPageLinkLabel}
        />
      );
    }
  } else if (showLibraryPageLink) {
    defaultFooter = (
      <WorkspaceAssetsUploadDialogFooter
        href={workspaceLibraryPageHref(workspaceId)}
        label={libraryPageLinkLabel}
      />
    );
  }

  const resolvedFooter = footer ?? defaultFooter;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,880px)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {typeof description === "string" ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <WorkspaceAssetsUploadPanels
            workspaceId={workspaceId}
            projectId={projectId}
            {...panelProps}
          />
        </div>
        {resolvedFooter}
      </DialogContent>
    </Dialog>
  );
}
