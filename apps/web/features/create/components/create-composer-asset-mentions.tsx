"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { toast } from "sonner";

import { useCreateAssetSuggest } from "@/features/create/hooks/use-create-asset-suggest";
import type { CreateAssetOption } from "@/features/create/hooks/use-create-asset-options";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { getMediaUrl } from "@/global/utils/media-url";
import { cn } from "@repo/ui/lib/utils";

type CreateComposerAssetMentionsProps = {
  workspaceId: string;
  projectId: string;
};

export const CreateComposerAssetMentions: FC<
  CreateComposerAssetMentionsProps
> = ({ workspaceId, projectId }) => {
  const aui = useAui();
  const draft = useAuiState((state) => state.composer.text);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const draftRef = useRef(draft);

  draftRef.current = draft;

  const setStagedAssets = useCreateProjectStore((state) => state.setStagedAssets);

  const { options: mentionMatches, isLoading: mentionLoading } =
    useCreateAssetSuggest(
      workspaceId,
      projectId,
      mentionQuery,
      mentionOpen,
    );

  useEffect(() => {
    const match = draft.match(/@([^\s@]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1] ?? "");
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, [draft]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionQuery, mentionMatches.length]);

  useEffect(() => {
    if (!mentionOpen || mentionMatches.length === 0) return;
    const item = listRef.current?.querySelector(
      `[data-mention-index="${activeIndex}"]`,
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, mentionOpen, mentionMatches.length]);

  const attachAsset = useCallback(
    async (option: CreateAssetOption) => {
      const currentDraft = draftRef.current;
      const nextDraft = currentDraft.replace(
        /@([^\s@]*)$/,
        `@${option.name} `,
      );
      aui.composer.setText(nextDraft);
      setMentionOpen(false);

      const alreadyStaged = useCreateProjectStore
        .getState()
        .byProject[projectId]?.stagedAssets.some((item) => item.id === option.id);
      if (alreadyStaged) return;

      const previewUrl = getMediaUrl(option.s3Key);
      if (!previewUrl) {
        toast.error("This asset is not ready to preview yet.");
        return;
      }

      setStagedAssets(projectId, (current) => [
        ...current,
        {
          id: option.id,
          name: option.name,
          s3Key: option.s3Key,
          scope: option.scope,
        },
      ]);

      try {
        await aui.composer.addAttachment({
          id: option.id,
          name: option.name,
          type: "image",
          contentType: "image/png",
          content: [{ type: "image", image: previewUrl }],
        });
      } catch (error) {
        useCreateProjectStore.getState().setStagedAssets(projectId, (current) =>
          current.filter((item) => item.id !== option.id),
        );
        toast.error(
          error instanceof Error ? error.message : "Could not attach this asset.",
        );
      }
    },
    [aui, projectId, setStagedAssets],
  );

  useEffect(() => {
    if (!mentionOpen || mentionMatches.length === 0) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) =>
          index >= mentionMatches.length - 1 ? 0 : index + 1,
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          index <= 0 ? mentionMatches.length - 1 : index - 1,
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const option = mentionMatches[activeIndex];
        if (option) void attachAsset(option);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [mentionOpen, mentionMatches, activeIndex, attachAsset]);

  if (!mentionOpen) return null;

  return (
    <div
      role="listbox"
      aria-label="Asset suggestions"
      className="pointer-events-auto absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg"
    >
      {mentionLoading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Searching assets…
        </p>
      ) : mentionMatches.length > 0 ? (
        <ul ref={listRef} className="max-h-48 overflow-y-auto p-1">
          {mentionMatches.map((option, index) => {
            const thumbUrl = getMediaUrl(option.s3Key);
            const isActive = index === activeIndex;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  data-mention-index={index}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors",
                    isActive
                      ? "bg-primary/15 text-primary ring-2 ring-primary ring-inset"
                      : "hover:bg-muted/60",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void attachAsset(option)}
                >
                  <div
                    className={cn(
                      "relative size-8 shrink-0 overflow-hidden rounded-md bg-muted",
                      isActive && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
                    )}
                  >
                    {thumbUrl ? (
                      <Image
                        src={thumbUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="32px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "truncate",
                      isActive && "font-semibold",
                    )}
                  >
                    {option.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          No matching assets. Try another name.
        </p>
      )}
    </div>
  );
};
