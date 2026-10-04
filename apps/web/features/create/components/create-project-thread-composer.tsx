"use client";

import type { FC } from "react";
import { ComposerPrimitive } from "@assistant-ui/react";

import { CreateComposerAction } from "@/features/create/components/create-composer-action";
import { CreateComposerHighlightedInput } from "@/features/create/components/create-composer-highlighted-input";

type CreateProjectThreadComposerProps = {
  autoFocus: boolean;
  projectId: string;
  workspaceId: string;
};

export const CreateProjectThreadComposer: FC<CreateProjectThreadComposerProps> = ({
  autoFocus,
  projectId,
  workspaceId,
}) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <div
        data-slot="aui_composer-shell"
        className="border-foreground/10 focus-within:border-foreground/25 flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) transition-[border-color]"
      >
        <CreateComposerHighlightedInput autoFocus={autoFocus} />
        <p className="px-1 text-xs text-muted-foreground">
          Tip: use up to 5 @ references per image. Pick the assets that should
          match most closely, then describe any additional people or details in
          your prompt.
        </p>
        <CreateComposerAction
          workspaceId={workspaceId}
          projectId={projectId}
        />
      </div>
    </ComposerPrimitive.Root>
  );
};
