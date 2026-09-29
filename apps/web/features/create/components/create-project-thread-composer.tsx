"use client";

import type { FC } from "react";
import { ComposerPrimitive } from "@assistant-ui/react";

import { CreateComposerHighlightedInput } from "@/features/create/components/create-composer-highlighted-input";
import { CreateComposerAttachments } from "@/features/create/components/create-composer-attachments";
import { ThreadComposerAction } from "@/global/components/assistant-ui/elements/thread.aui";

type CreateProjectThreadComposerProps = {
  autoFocus: boolean;
  projectId: string;
};

export const CreateProjectThreadComposer: FC<CreateProjectThreadComposerProps> = ({
  autoFocus,
  projectId,
}) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="border-foreground/10 focus-within:border-foreground/25 data-[dragging=true]:border-ring flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) transition-[border-color] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))]"
        >
          <CreateComposerAttachments projectId={projectId} />
          <CreateComposerHighlightedInput autoFocus={autoFocus} />
          <ThreadComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};
