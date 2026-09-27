"use client";

import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";

import { CreateComposerMentionHighlight } from "@/features/create/components/create-composer-mention-highlight";
import { cn } from "@repo/ui/lib/utils";

const composerInputTypography =
  "font-normal tracking-normal [font-variant-ligatures:none] text-base leading-6";

const composerInputLayout =
  "aui-composer-input max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 outline-none";

type CreateComposerHighlightedInputProps = {
  autoFocus?: boolean;
};

export function CreateComposerHighlightedInput({
  autoFocus,
}: CreateComposerHighlightedInputProps) {
  const text = useAuiState((state) => state.composer.text);

  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className={cn(
          composerInputLayout,
          composerInputTypography,
          "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap wrap-break-word",
        )}
      >
        <CreateComposerMentionHighlight text={text} />
      </div>
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        className={cn(
          composerInputLayout,
          composerInputTypography,
          "caret-foreground relative z-1 text-transparent placeholder:text-muted-foreground/60 selection:bg-primary/20",
        )}
        rows={1}
        autoFocus={autoFocus}
        enterKeyHint="send"
        aria-label="Message input"
        spellCheck={false}
      />
    </div>
  );
}
