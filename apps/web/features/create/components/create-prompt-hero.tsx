"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { useCreateAssetSuggest } from "@/features/create/hooks/use-create-asset-suggest";
import type { CreateAssetOption } from "@/features/create/hooks/use-create-asset-options";
import type {
  CreateAttachedAsset,
  CreateSessionState,
} from "@/features/create/types/create-ui";
import { getMediaUrl } from "@/global/utils/media-url";

type CreatePromptHeroProps = {
  workspaceId: string;
  projectId: string;
  session: CreateSessionState;
  onDraftChange: (value: string) => void;
  onGenerate: (attachments: CreateAttachedAsset[]) => void;
};

export function CreatePromptHero({
  workspaceId,
  projectId,
  session,
  onDraftChange,
  onGenerate,
}: CreatePromptHeroProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [attachments, setAttachments] = useState<CreateAttachedAsset[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { options: mentionMatches, isLoading: mentionLoading } =
    useCreateAssetSuggest(
      workspaceId,
      projectId,
      mentionQuery,
      mentionOpen,
    );

  useEffect(() => {
    const match = session.draft.match(/@([^\s@]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1] ?? "");
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, [session.draft]);

  function attachAsset(option: CreateAssetOption) {
    setAttachments((current) => {
      if (current.some((item) => item.id === option.id)) return current;
      return [
        ...current,
        {
          id: option.id,
          name: option.name,
          s3Key: option.s3Key,
          scope: option.scope,
        },
      ];
    });
    onDraftChange(session.draft.replace(/@([^\s@]*)$/, `@${option.name} `));
    setMentionOpen(false);
    textareaRef.current?.focus();
  }

  function handleGenerate() {
    if (!session.draft.trim() && attachments.length === 0) {
      toast.error("Describe what you want to create first.");
      return;
    }
    onGenerate(attachments);
    setAttachments([]);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="text-center">
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          Project create
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          What will you create today?
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Describe your idea and use @ to attach assets from your library.
        </p>
      </div>

      <div className="relative mt-8">
        {mentionOpen ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
            {mentionLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Searching assets…
              </p>
            ) : mentionMatches.length > 0 ? (
              <ul className="max-h-48 overflow-y-auto p-1">
                {mentionMatches.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/60"
                      onClick={() => attachAsset(option)}
                    >
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
                        {getMediaUrl(option.s3Key) ? (
                          <Image
                            src={getMediaUrl(option.s3Key)!}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <span className="truncate">{option.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matching assets. Try another name.
              </p>
            )}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <Textarea
            ref={textareaRef}
            value={session.draft}
            rows={4}
            placeholder="What do you want to create?"
            className="min-h-32 resize-none rounded-none border-0 bg-transparent px-4 py-4 text-base shadow-none focus-visible:ring-0"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleGenerate();
              }
            }}
          />

          <div className="flex justify-end border-t border-border/60 bg-muted/20 px-3 py-3">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 px-4"
              onClick={handleGenerate}
            >
              <SparklesIcon className="size-3.5" />
              Generate
            </Button>
          </div>
        </div>

        {attachments.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((asset) => (
              <span
                key={asset.id}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs"
              >
                @{asset.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
