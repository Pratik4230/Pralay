"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDownIcon,
  FolderOpenIcon,
  ImagePlusIcon,
  PlusIcon,
  SparklesIcon,
  Wand2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Textarea } from "@repo/ui/components/textarea";

import {
  CREATE_CHAT_MODELS,
  CREATE_QUICK_SUGGESTIONS,
} from "@/features/create/constants/create-presets";
import {
  filterCreateAssetOptions,
  type CreateAssetOption,
} from "@/features/create/hooks/use-create-asset-options";
import type {
  CreateAttachedAsset,
  CreateChatModelId,
  CreateSessionState,
} from "@/features/create/types/create-ui";
import { getMediaUrl } from "@/global/utils/media-url";

type CreatePromptHeroProps = {
  session: CreateSessionState;
  assetOptions: CreateAssetOption[];
  onDraftChange: (value: string) => void;
  onChatModelChange: (id: CreateChatModelId) => void;
  onGenerate: (attachments: CreateAttachedAsset[]) => void;
  onQuickSuggestion: (prompt: string) => void;
  onOpenProjectAssets: () => void;
};

export function CreatePromptHero({
  session,
  assetOptions,
  onDraftChange,
  onChatModelChange,
  onGenerate,
  onQuickSuggestion,
  onOpenProjectAssets,
}: CreatePromptHeroProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [attachments, setAttachments] = useState<CreateAttachedAsset[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel =
    CREATE_CHAT_MODELS.find((model) => model.id === session.chatModelId) ??
    CREATE_CHAT_MODELS[0]!;

  const mentionMatches = useMemo(
    () => filterCreateAssetOptions(assetOptions, mentionQuery, 8),
    [assetOptions, mentionQuery],
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
          Describe your idea, attach project or workspace assets, and generate
          in this thread.
        </p>
      </div>

      <div className="relative mt-8">
        {mentionOpen && mentionMatches.length > 0 ? (
          <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg">
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
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <Textarea
            ref={textareaRef}
            value={session.draft}
            rows={4}
            placeholder="Describe what you want to create… Example: YouTube thumbnail for Jonathan's championship with team, trophy, and bold CHAMPIONS text."
            className="min-h-32 resize-none rounded-none border-0 bg-transparent px-4 py-4 text-base shadow-none focus-visible:ring-0"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleGenerate();
              }
            }}
          />

          <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
                <PlusIcon className="size-3.5" />
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={() => textareaRef.current?.focus()}
              >
                <ImagePlusIcon className="size-3.5" />
                Add assets
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={onOpenProjectAssets}
              >
                <FolderOpenIcon className="size-3.5" />
                Project assets
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  toast.message("Improve prompt (coming soon)", {
                    description: "The assistant will refine your prompt when the backend is ready.",
                  })
                }
              >
                <Wand2Icon className="size-3.5" />
                Improve prompt
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                  >
                    {selectedModel.label}
                    <ChevronDownIcon className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {CREATE_CHAT_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => onChatModelChange(model.id)}
                    >
                      <span className="font-medium">{model.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

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

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {CREATE_QUICK_SUGGESTIONS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onQuickSuggestion(item.prompt)}
            className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
