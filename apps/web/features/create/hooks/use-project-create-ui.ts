"use client";

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import type {
  CreateChatModelId,
  CreateSessionState,
  CreateThread,
} from "@/features/create/types/create-ui";
import { useProjectAssistantThreads } from "@/features/create/hooks/use-project-assistant";
import {
  DEFAULT_SESSION,
  useCreateProjectStore,
} from "@/features/create/store/create-project-store";
import { assistantThreadToCreateThread } from "@/features/create/utils/assistant-thread-ui";

export { DEFAULT_SESSION } from "@/features/create/store/create-project-store";

export function useProjectCreateUi(workspaceId: string, projectId: string) {
  const hasHydrated = useCreateProjectStore((state) => state.hasHydrated);
  const ensureProject = useCreateProjectStore((state) => state.ensureProject);
  const slice = useCreateProjectStore(
    useShallow((state) => state.byProject[projectId]),
  );

  const startNewChat = useCreateProjectStore((state) => state.startNewChat);
  const selectThread = useCreateProjectStore((state) => state.selectThread);
  const setDraft = useCreateProjectStore((state) => state.setDraft);
  const setChatModel = useCreateProjectStore((state) => state.setChatModel);

  const threadsQuery = useProjectAssistantThreads(workspaceId, projectId);

  useEffect(() => {
    ensureProject(projectId);
  }, [projectId, ensureProject]);

  useEffect(() => {
    const serverThreads = threadsQuery.data?.threads ?? [];
    if (serverThreads.length === 0) return;

    const current = useCreateProjectStore.getState().byProject[projectId];
    if (!current || current.newChatMode || current.activeThreadId) return;

    selectThread(projectId, serverThreads[0]!.id);
  }, [threadsQuery.data, projectId, selectThread]);

  const threads = useMemo((): CreateThread[] => {
    return (threadsQuery.data?.threads ?? []).map(assistantThreadToCreateThread);
  }, [threadsQuery.data]);

  const activeThreadId = slice?.activeThreadId ?? null;
  const session: CreateSessionState = slice?.session ?? DEFAULT_SESSION;

  const activeThread = useMemo((): CreateThread | null => {
    if (!activeThreadId) return null;
    return threads.find((thread) => thread.id === activeThreadId) ?? null;
  }, [threads, activeThreadId]);

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
    threadsLoading: threadsQuery.isLoading,
    threads,
    activeThread,
    activeThreadId,
    session,
    createThread: () => startNewChat(projectId),
    selectThread: (threadId: string) => selectThread(projectId, threadId),
    setDraft: (draft: string) => setDraft(projectId, draft),
    setChatModel: (chatModelId: CreateChatModelId) =>
      setChatModel(projectId, chatModelId),
    updateSession,
  };
}

export type ProjectCreateUi = ReturnType<typeof useProjectCreateUi>;
