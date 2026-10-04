"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";

import { useCreateAssetSuggest } from "@/features/create/hooks/use-create-asset-suggest";
import type { CreateAssetOption } from "@/features/create/types/create-asset-option";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { useCreateComposerCaret } from "@/features/create/components/create-composer-caret-context";
import {
  caretIndexAfterComposerMention,
  findActiveComposerMention,
  replaceActiveComposerMention,
  type ActiveComposerMention,
} from "@/features/create/utils/create-composer-mention-at-caret";
import { getMediaUrl } from "@/global/utils/media-url";
import { cn } from "@repo/ui/lib/utils";

type CreateComposerAssetMentionsProps = {
  workspaceId: string;
  projectId: string;
};

const MAX_GENERATION_REFERENCES = 5;

export const CreateComposerAssetMentions: FC<
  CreateComposerAssetMentionsProps
> = ({ workspaceId, projectId }) => {
  const aui = useAui();
  const draft = useAuiState((state) => state.composer.text);
  const { getCaretIndex, subscribeCaretMove, queueCaretAfterEdit } =
    useCreateComposerCaret();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [caretTick, setCaretTick] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const draftRef = useRef(draft);
  const activeMentionRef = useRef<ActiveComposerMention | null>(null);
  const skipMentionDetectionRef = useRef(false);

  draftRef.current = draft;

  const setStagedAssets = useCreateProjectStore((state) => state.setStagedAssets);
  const stagedAssetCount = useCreateProjectStore(
    (state) => state.byProject[projectId]?.stagedAssets.length ?? 0,
  );

  const { options: mentionMatches, isLoading: mentionLoading } =
    useCreateAssetSuggest(
      workspaceId,
      projectId,
      mentionQuery,
      mentionOpen,
    );

  useEffect(() => subscribeCaretMove(() => setCaretTick((value) => value + 1)), [
    subscribeCaretMove,
  ]);

  useEffect(() => {
    if (skipMentionDetectionRef.current) {
      skipMentionDetectionRef.current = false;
      activeMentionRef.current = null;
      setMentionOpen(false);
      setMentionQuery("");
      return;
    }

    const active = findActiveComposerMention(draft, getCaretIndex());
    activeMentionRef.current = active;
    if (active) {
      setMentionOpen(true);
      setMentionQuery(active.query);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }, [caretTick, draft, getCaretIndex]);

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
    (option: CreateAssetOption) => {
      const currentDraft = draftRef.current;
      const mention = activeMentionRef.current;
      if (!mention) return;

      const alreadyStaged = useCreateProjectStore
        .getState()
        .byProject[projectId]?.stagedAssets.some((item) => item.id === option.id);
      if (!alreadyStaged && stagedAssetCount >= MAX_GENERATION_REFERENCES) {
        return;
      }

      const nextDraft = replaceActiveComposerMention(
        currentDraft,
        mention,
        option.name,
      );
      const nextCaret = caretIndexAfterComposerMention(mention, option.name);

      skipMentionDetectionRef.current = true;
      queueCaretAfterEdit(nextCaret);
      aui.composer.setText(nextDraft);
      setMentionOpen(false);
      setMentionQuery("");
      activeMentionRef.current = null;

      if (alreadyStaged) return;

      setStagedAssets(projectId, (current) => [
        ...current,
        {
          id: option.id,
          name: option.name,
          s3Key: option.s3Key,
          scope: option.scope,
        },
      ]);
    },
    [aui, projectId, queueCaretAfterEdit, setStagedAssets, stagedAssetCount],
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
        if (option) attachAsset(option);
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
      ) : stagedAssetCount >= MAX_GENERATION_REFERENCES ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Up to 5 references can guide one image. Remove a mention to choose another.
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
                  onClick={() => attachAsset(option)}
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
