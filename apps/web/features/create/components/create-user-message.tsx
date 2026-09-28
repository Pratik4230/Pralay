"use client";

import type { FC } from "react";
import {
  ActionBarPrimitive,
  BranchPickerPrimitive,
  MessagePrimitive,
  useAuiState,
  type FileMessagePartComponent,
  type ImageMessagePartComponent,
} from "@assistant-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from "lucide-react";

import { CreateGenerationCard } from "@/features/create/components/create-generation-card";
import {
  useCreateGenerationsScope,
  useCreateMessageGeneration,
} from "@/features/create/components/create-generations-context";
import { UserMessageAttachments } from "@/global/components/assistant-ui/elements/attachment.aui";
import { File } from "@/global/components/assistant-ui/elements/file";
import { Image } from "@/global/components/assistant-ui/elements/image";
import { TooltipIconButton } from "@/global/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@repo/ui/lib/utils";

const UserFilePart: FileMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <File {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <Image {...part} />
  </div>
);

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const UserBranchPicker: FC<{ className?: string }> = ({ className }) => (
  <BranchPickerPrimitive.Root
    hideWhenSingleBranch
    className={cn(
      "text-muted-foreground inline-flex items-center gap-0.5 text-xs",
      className,
    )}
  >
    <BranchPickerPrimitive.Previous asChild>
      <TooltipIconButton tooltip="Previous">
        <ChevronLeftIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
    <span className="font-medium">
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
    </span>
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip="Next">
        <ChevronRightIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  </BranchPickerPrimitive.Root>
);

export const CreateUserMessage: FC = () => {
  const messageId = useAuiState((state) => state.message.id);
  const generation = useCreateMessageGeneration(messageId);
  const { workspaceId, projectId } = useCreateGenerationsScope();

  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground rounded-(--composer-radius) px-4 py-2 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts
            components={{ File: UserFilePart, Image: UserImagePart }}
          />
        </div>
        <div className="aui-user-action-bar-wrapper absolute inset-s-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>

      {generation ? (
        <div className="col-span-full col-start-1 min-w-0 max-w-[min(100%,42rem)] justify-self-end">
          <CreateGenerationCard
            workspaceId={workspaceId}
            projectId={projectId}
            generation={generation}
          />
        </div>
      ) : null}

      <div
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 flex -me-1 justify-end"
      >
        <UserBranchPicker />
      </div>
    </MessagePrimitive.Root>
  );
};
