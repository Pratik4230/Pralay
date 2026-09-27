"use client";

import { useEffect, useRef, type FC } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import { useShallow } from "zustand/react/shallow";

import { CREATE_MENTION_ATTACHMENT_SYNC_MS } from "@/features/create/constants/create-timing";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import {
  removeAssetMentionFromText,
  textIncludesAssetMention,
} from "@/features/create/utils/create-asset-mention-sync";

type CreateComposerAttachmentSyncProps = {
  projectId: string;
};

/** Lightweight `@` ↔ library attachment sync (no store subscriptions). */
export const CreateComposerAttachmentSync: FC<
  CreateComposerAttachmentSyncProps
> = ({ projectId }) => {
  const aui = useAui();
  const text = useAuiState((state) => state.composer.text);
  const attachmentIds = useAuiState(
    useShallow((state) => state.composer.attachments.map((item) => item.id)),
  );
  const attachmentKey = attachmentIds.join("\0");
  const prevAttachmentKeyRef = useRef(attachmentKey);
  const debouncedTextRef = useRef(text);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevAttachmentKeyRef.current === attachmentKey) return;

    const previousIds = prevAttachmentKeyRef.current
      ? prevAttachmentKeyRef.current.split("\0")
      : [];
    const currentIdSet = new Set(attachmentIds);

    for (const id of previousIds) {
      if (!id || currentIdSet.has(id)) continue;

      const asset = useCreateProjectStore
        .getState()
        .byProject[projectId]?.stagedAssets.find((item) => item.id === id);
      if (!asset) continue;

      useCreateProjectStore.getState().setStagedAssets(projectId, (current) =>
        current.filter((item) => item.id !== id),
      );

      const composerText = aui.composer.getState().text;
      const nextText = removeAssetMentionFromText(composerText, asset.name);
      if (nextText !== composerText) {
        aui.composer.setText(nextText);
      }
    }

    prevAttachmentKeyRef.current = attachmentKey;
  }, [attachmentKey, attachmentIds, aui, projectId]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debouncedTextRef.current = text;

      const staged =
        useCreateProjectStore.getState().byProject[projectId]?.stagedAssets ??
        [];
      if (staged.length === 0) return;

      const composerAttachments = aui.composer.getState().attachments;
      for (const asset of staged) {
        const stillAttached = composerAttachments.some(
          (item) => item.id === asset.id,
        );
        if (!stillAttached) continue;
        if (textIncludesAssetMention(debouncedTextRef.current, asset.name)) {
          continue;
        }

        useCreateProjectStore.getState().setStagedAssets(projectId, (current) =>
          current.filter((item) => item.id !== asset.id),
        );
        void aui.composer.attachment({ id: asset.id }).remove();
      }
    }, CREATE_MENTION_ATTACHMENT_SYNC_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [text, projectId, aui]);

  return null;
};
