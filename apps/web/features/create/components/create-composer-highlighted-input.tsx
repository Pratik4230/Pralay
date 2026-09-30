"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { ComposerPrimitive, useAuiState } from "@assistant-ui/react";

import { useCreateComposerCaret } from "@/features/create/components/create-composer-caret-context";
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
  const { registerTextarea, notifyCaretMove, consumeQueuedCaret } =
    useCreateComposerCaret();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const setInputRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el;
      registerTextarea(el);
    },
    [registerTextarea],
  );

  const syncCaretMove = useCallback(() => {
    notifyCaretMove();
  }, [notifyCaretMove]);

  useLayoutEffect(() => {
    const queued = consumeQueuedCaret();
    if (queued == null) return;

    const el = inputRef.current;
    if (!el) return;

    try {
      el.focus();
      el.setSelectionRange(queued, queued);
    } catch {
      // Input may not be focusable during unmount.
    }
  }, [text, consumeQueuedCaret]);

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
        ref={setInputRef}
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
        onSelect={syncCaretMove}
        onClick={syncCaretMove}
        onKeyUp={syncCaretMove}
        onInput={syncCaretMove}
      />
    </div>
  );
}
