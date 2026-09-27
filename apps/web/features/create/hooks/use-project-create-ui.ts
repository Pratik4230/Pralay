"use client";

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type {
  CreateAttachedAsset,
  CreateChatModelId,
  CreateRecentItem,
  CreateSessionState,
  CreateThread,
} from "@/features/create/types/create-ui";
import { deriveThreadTitleFromMessage } from "@/features/create/utils/create-thread-title";
import {
  DEFAULT_SESSION,
  useCreateProjectStore,
} from "@/features/create/store/create-project-store";

export { DEFAULT_SESSION } from "@/features/create/store/create-project-store";

export function useProjectCreateUi(projectId: string) {
  const hasHydrated = useCreateProjectStore((state) => state.hasHydrated);
  const ensureProject = useCreateProjectStore((state) => state.ensureProject);
  const slice = useCreateProjectStore(
    useShallow((state) => state.byProject[projectId]),
  );

  const createThread = useCreateProjectStore((state) => state.createThread);
  const selectThread = useCreateProjectStore((state) => state.selectThread);
  const setDraft = useCreateProjectStore((state) => state.setDraft);
  const setChatModel = useCreateProjectStore((state) => state.setChatModel);
  const toggleReferenceAsset = useCreateProjectStore(
    (state) => state.toggleReferenceAsset,
  );
  const submitUserMessage = useCreateProjectStore(
    (state) => state.submitUserMessage,
  );

  useEffect(() => {
    ensureProject(projectId);
  }, [projectId, ensureProject]);

  const threads = slice?.threads ?? [];
  const activeThreadId = slice?.activeThreadId ?? null;
  const session: CreateSessionState = slice?.session ?? DEFAULT_SESSION;

  const activeThread = useMemo((): CreateThread | null => {
    return threads.find((thread) => thread.id === activeThreadId) ?? null;
  }, [threads, activeThreadId]);

  const recentCreations = useMemo((): CreateRecentItem[] => {
    const items: CreateRecentItem[] = [];
    for (const thread of threads) {
      for (const message of thread.messages) {
        if (!message.generation) continue;
        items.push({
          id: message.generation.id,
          title: deriveThreadTitleFromMessage(message.generation.prompt),
          updatedAt: message.createdAt,
          status: message.generation.status,
        });
      }
    }
    return items
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 8);
  }, [threads]);

  const submitPrompt = (
    content: string,
    attachments: CreateAttachedAsset[],
    _referenceNames: string[],
  ) => {
    submitUserMessage(projectId, {
      text: content,
      libraryAssets: attachments,
    });
    setDraft(projectId, "");
  };

  const updateSession = (patch: Partial<CreateSessionState>) => {
    if (patch.draft !== undefined) {
      setDraft(projectId, patch.draft);
    }
    if (patch.chatModelId !== undefined) {
      setChatModel(projectId, patch.chatModelId);
    }
  };

  return {
    hydrated: hasHydrated,
    threads,
    activeThread,
    activeThreadId,
    session,
    recentCreations,
    createThread: () => createThread(projectId),
    selectThread: (threadId: string) => selectThread(projectId, threadId),
    submitPrompt,
    toggleReferenceAsset: (assetId: string) =>
      toggleReferenceAsset(projectId, assetId),
    setDraft: (draft: string) => setDraft(projectId, draft),
    setChatModel: (chatModelId: CreateChatModelId) =>
      setChatModel(projectId, chatModelId),
    updateSession,
  };
}
