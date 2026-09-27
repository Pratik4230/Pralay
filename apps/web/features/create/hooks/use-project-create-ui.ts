"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CreateAttachedAsset,
  CreateChatModelId,
  CreateGenerationUiStatus,
  CreateRecentItem,
  CreateSessionState,
  CreateThread,
  CreateThreadMessage,
} from "@/features/create/types/create-ui";
import { deriveThreadTitleFromMessage } from "@/features/create/utils/create-thread-title";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptyThread(): CreateThread {
  const id = createId();
  return {
    id,
    title: "New conversation",
    titleAuto: true,
    updatedAt: nowIso(),
    messages: [],
  };
}

type PersistedCreateUi = {
  threads: CreateThread[];
  activeThreadId: string | null;
  session: CreateSessionState;
};

export const DEFAULT_SESSION: CreateSessionState = {
  draft: "",
  chatModelId: "gpt-5.4-mini",
  referenceAssetIds: [],
};

function storageKey(projectId: string) {
  return `pralay-create-ui:${projectId}`;
}

function loadPersisted(projectId: string): PersistedCreateUi | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCreateUi;
    const session = { ...DEFAULT_SESSION, ...parsed.session };
    if ((session.chatModelId as string) === "grok-fast") {
      session.chatModelId = DEFAULT_SESSION.chatModelId;
    }
    return {
      ...parsed,
      session,
    };
  } catch {
    return null;
  }
}

function savePersisted(projectId: string, data: PersistedCreateUi) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function useProjectCreateUi(projectId: string) {
  const [threads, setThreads] = useState<CreateThread[]>(() => [
    createEmptyThread(),
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [session, setSession] = useState<CreateSessionState>(DEFAULT_SESSION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersisted(projectId);
    if (saved?.threads.length) {
      setThreads(saved.threads);
      setActiveThreadId(
        saved.activeThreadId ?? saved.threads[0]?.id ?? null,
      );
      setSession(saved.session);
    } else {
      const initial = createEmptyThread();
      setThreads([initial]);
      setActiveThreadId(initial.id);
    }
    setHydrated(true);
  }, [projectId]);

  useEffect(() => {
    if (!hydrated) return;
    savePersisted(projectId, {
      threads,
      activeThreadId,
      session,
    });
  }, [projectId, threads, activeThreadId, session, hydrated]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

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

  const updateSession = useCallback((patch: Partial<CreateSessionState>) => {
    setSession((current) => ({ ...current, ...patch }));
  }, []);

  const createThread = useCallback(() => {
    const thread = createEmptyThread();
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    return thread.id;
  }, []);

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  const appendMessage = useCallback(
    (
      threadId: string,
      message: Omit<CreateThreadMessage, "id" | "createdAt">,
    ) => {
      const entry: CreateThreadMessage = {
        ...message,
        id: createId(),
        createdAt: nowIso(),
      };

      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId) return thread;

          let title = thread.title;
          let titleAuto = thread.titleAuto;

          if (
            message.role === "user" &&
            thread.titleAuto &&
            message.content.trim()
          ) {
            title = deriveThreadTitleFromMessage(message.content);
            titleAuto = true;
          }

          return {
            ...thread,
            title,
            titleAuto,
            messages: [...thread.messages, entry],
            updatedAt: nowIso(),
          };
        }),
      );

      return entry.id;
    },
    [],
  );

  const patchGenerationStatus = useCallback(
    (
      threadId: string,
      generationId: string,
      status: CreateGenerationUiStatus,
    ) => {
      setThreads((current) =>
        current.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            messages: thread.messages.map((message) => {
              if (message.generation?.id !== generationId) return message;
              return {
                ...message,
                generation: { ...message.generation, status },
              };
            }),
            updatedAt: nowIso(),
          };
        }),
      );
    },
    [],
  );

  const submitPrompt = useCallback(
    (
      content: string,
      attachments: CreateAttachedAsset[],
      referenceNames: string[],
    ) => {
      if (!activeThreadId) return;
      const trimmed = content.trim();
      if (!trimmed && attachments.length === 0) return;

      const userText =
        trimmed || "Generate using the attached reference images.";

      appendMessage(activeThreadId, {
        role: "user",
        content: userText,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      const generationId = createId();

      appendMessage(activeThreadId, {
        role: "assistant",
        content: "Working on your request (UI preview). Results will appear here when generation is connected.",
        generation: {
          id: generationId,
          status: "queued",
          prompt: userText,
          referenceNames,
        },
      });

      window.setTimeout(() => {
        patchGenerationStatus(activeThreadId, generationId, "processing");
      }, 900);

      window.setTimeout(() => {
        patchGenerationStatus(activeThreadId, generationId, "completed");
        appendMessage(activeThreadId, {
          role: "assistant",
          content:
            "Preview complete. Image output will show in this thread once the Gemini pipeline is wired.",
        });
      }, 2800);
    },
    [activeThreadId, appendMessage, patchGenerationStatus],
  );

  const toggleReferenceAsset = useCallback((assetId: string) => {
    setSession((current) => {
      const exists = current.referenceAssetIds.includes(assetId);
      return {
        ...current,
        referenceAssetIds: exists
          ? current.referenceAssetIds.filter((id) => id !== assetId)
          : [...current.referenceAssetIds, assetId],
      };
    });
  }, []);

  const setDraft = useCallback(
    (draft: string) => {
      updateSession({ draft });
    },
    [updateSession],
  );

  const setChatModel = useCallback(
    (chatModelId: CreateChatModelId) => {
      updateSession({ chatModelId });
    },
    [updateSession],
  );

  return {
    hydrated,
    threads,
    activeThread,
    activeThreadId,
    session,
    recentCreations,
    createThread,
    selectThread,
    submitPrompt,
    toggleReferenceAsset,
    setDraft,
    setChatModel,
    updateSession,
  };
}
