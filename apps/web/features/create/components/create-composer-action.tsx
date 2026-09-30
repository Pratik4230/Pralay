"use client";

import { useState, type FC } from "react";
import {
  AuiIf,
  ComposerPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowUpIcon, FolderUpIcon, SquareIcon } from "lucide-react";

import { WorkspaceAssetsUploadDialog } from "@/features/workspace/components/workspace-assets-upload-dialog";
import { TooltipIconButton } from "@/global/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@repo/ui/components/button";

type CreateComposerActionProps = {
  workspaceId: string;
  projectId: string;
};

export const CreateComposerAction: FC<CreateComposerActionProps> = ({
  workspaceId,
  projectId,
}) => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const isSending = useAuiState(
    (s) =>
      s.composer.submission !== undefined &&
      !(s.thread.isRunning && s.thread.capabilities.cancel),
  );

  return (
    <>
      <div className="aui-composer-action-wrapper relative flex items-center justify-between">
        <TooltipIconButton
          tooltip="Upload to library"
          side="bottom"
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-muted-foreground/15 size-7 rounded-full"
          aria-label="Upload to library"
          onClick={() => setUploadOpen(true)}
        >
          <FolderUpIcon className="size-4" />
        </TooltipIconButton>

        <div className="flex items-center gap-1.5">
          <AuiIf
            condition={(s) =>
              !s.composer.canCancel ||
              (s.thread.voice !== undefined &&
                s.composer.submission === undefined)
            }
          >
            <ComposerPrimitive.Send asChild>
              <TooltipIconButton
                tooltip="Send message"
                side="bottom"
                type="button"
                variant="default"
                size="icon"
                className="aui-composer-send size-7 rounded-full"
                aria-label="Send message"
              >
                <ArrowUpIcon className="aui-composer-send-icon size-4" />
              </TooltipIconButton>
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf
            condition={(s) =>
              s.composer.canCancel &&
              (s.thread.voice === undefined ||
                s.composer.submission !== undefined)
            }
          >
            <ComposerPrimitive.Cancel asChild>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="aui-composer-cancel size-7 rounded-full"
                aria-label={isSending ? "Cancel sending" : "Stop generating"}
              >
                <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
              </Button>
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>

      <WorkspaceAssetsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        workspaceId={workspaceId}
        projectId={projectId}
        title="Upload to library"
        description="Add images to your project or workspace library. When uploads finish, close this dialog and type @ in your prompt to reference them."
        showAssetsPageLink
        projectEmptyMessage="Upload project images here, then reference them with @ in Create."
        workspaceEmptyMessage="Upload shared references here, then pick them with @ in Create."
      />
    </>
  );
};
