"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";

import { CreateComposerSessionRestore } from "@/features/create/components/create-composer-session-restore";
import { CreateGenerationsProvider } from "@/features/create/components/create-generations-context";
import { useProjectAssistantMessages } from "@/features/create/hooks/use-project-assistant";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { convertCreateThreadMessage } from "@/features/create/utils/convert-create-thread-message";
import type { CreateThreadMessage } from "@/features/create/types/create-ui";
import { mapAssistantMessagesToCreateMessages } from "@/features/create/utils/map-assistant-messages";
import { resolveCreateSendReferenceAssets } from "@/features/create/utils/resolve-create-send-references";
import { createKeys } from "@/features/create/utils/query-keys";
import { streamProjectAssistantMessage } from "@/features/create/utils/stream-project-assistant";

type CreateProjectRuntimeProviderProps = {
  workspaceId: string;
  projectId: string;
  children: ReactNode;
};

type StreamedAssistantOverlay = {
  id: string;
  threadId: string;
  content: string;
  createdAt: string;
};

function extractUserText(message: AppendMessage): string {
  return message.content
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n")
    .trim();
}

export function CreateProjectRuntimeProvider({
  workspaceId,
  projectId,
  children,
}: CreateProjectRuntimeProviderProps) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [streamedAssistant, setStreamedAssistant] =
    useState<StreamedAssistantOverlay | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    useCreateProjectStore.getState().ensureProject(projectId);
  }, [projectId]);

  const activeThreadId = useCreateProjectStore(
    (state) => state.byProject[projectId]?.activeThreadId ?? null,
  );

  const messagesQuery = useProjectAssistantMessages(
    workspaceId,
    projectId,
    activeThreadId,
  );

  // ---------------------------------------------------------------------------
  // Map DB messages to assistant-ui format
  // ---------------------------------------------------------------------------
  const messages = useMemo((): CreateThreadMessage[] => {
    const persisted =
      activeThreadId && messagesQuery.data
        ? mapAssistantMessagesToCreateMessages(
            queryClient,
            workspaceId,
            messagesQuery.data.messages,
          )
        : [];

    if (
      streamedAssistant &&
      streamedAssistant.threadId === activeThreadId &&
      !persisted.some((message) => message.id === streamedAssistant.id)
    ) {
      return [
        ...persisted,
        {
          id: streamedAssistant.id,
          role: "assistant",
          content: streamedAssistant.content,
          createdAt: streamedAssistant.createdAt,
        },
      ];
    }

    return persisted;
  }, [
    activeThreadId,
    messagesQuery.data,
    queryClient,
    streamedAssistant,
    workspaceId,
  ]);

  useEffect(() => {
    if (!streamedAssistant || !messagesQuery.data) return;
    if (
      messagesQuery.data.messages.some(
        (message) => message.id === streamedAssistant.id,
      )
    ) {
      setStreamedAssistant(null);
    }
  }, [messagesQuery.data, streamedAssistant]);

  const generationsByMessageId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<CreateThreadMessage["generation"]>
    >();
    for (const message of messages) {
      if (message.generation) {
        map.set(message.id, message.generation);
      }
    }
    return map;
  }, [messages]);

  // ---------------------------------------------------------------------------
  // Send handler: stream NDJSON events, then reconcile with persisted messages.
  // ---------------------------------------------------------------------------
  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractUserText(message).trim();
      const staged =
        useCreateProjectStore.getState().byProject[projectId]?.stagedAssets ??
        [];
      const libraryAssets = resolveCreateSendReferenceAssets(staged, text);

      if (!text && libraryAssets.length === 0) return;

      const prompt = text || "Generate using the attached reference images.";
      const slice = useCreateProjectStore.getState().byProject[projectId];

      // Clear draft + staged immediately (synchronous, no race condition).
      useCreateProjectStore.getState().setDraft(projectId, "");
      useCreateProjectStore.getState().clearStagedAssets(projectId);

      setIsRunning(true);
      setStreamedAssistant(null);
      const abortController = new AbortController();
      streamAbortRef.current = abortController;
      let streamError: string | null = null;
      let streamedThreadId: string | undefined;

      const reconcileStreamedThread = (threadId: string) => {
        void queryClient.invalidateQueries({
          queryKey: createKeys.assistantThreads(workspaceId, projectId),
        });
        void queryClient.invalidateQueries({
          queryKey: createKeys.assistantMessages(
            workspaceId,
            projectId,
            threadId,
          ),
        });
      };

      try {
        const result = await streamProjectAssistantMessage(
          workspaceId,
          projectId,
          {
            threadId: slice?.activeThreadId ?? undefined,
            prompt,
            referenceAssetIds: libraryAssets.map((a) => a.id),
            chatModelId: slice?.session.chatModelId ?? "gpt-5.4-mini",
          },
          {
            signal: abortController.signal,
            onMeta: ({ thread }) => {
              streamedThreadId = thread.id;
              useCreateProjectStore
                .getState()
                .setActiveThreadId(projectId, thread.id);
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantThreads(workspaceId, projectId),
              });
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantMessages(
                  workspaceId,
                  projectId,
                  thread.id,
                ),
              });
            },
            onGeneration: ({ userMessage }) => {
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantMessages(
                  workspaceId,
                  projectId,
                  userMessage.threadId,
                ),
              });
            },
            onTextDelta: (_delta, fullText) => {
              if (!streamedThreadId) return;
              setStreamedAssistant({
                id: `streaming-${streamedThreadId}`,
                threadId: streamedThreadId,
                content: fullText,
                createdAt: new Date().toISOString(),
              });
            },
            onDone: ({ thread, assistantMessage }) => {
              streamedThreadId = thread.id;
              if (assistantMessage) {
                setStreamedAssistant({
                  id: assistantMessage.id,
                  threadId: thread.id,
                  content: assistantMessage.content,
                  createdAt: assistantMessage.createdAt,
                });
              } else {
                setStreamedAssistant(null);
              }
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantThreads(workspaceId, projectId),
              });
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantMessages(
                  workspaceId,
                  projectId,
                  thread.id,
                ),
              });
            },
            onError: (message) => {
              streamError = message;
            },
          },
        );

        if (!result.completed && !abortController.signal.aborted) {
          if (streamError) {
            throw new Error(streamError);
          }
          if (!result.threadId) {
            throw new Error("Assistant stream ended before metadata");
          }

          // The user message is already persisted. If a proxy closes after the
          // meta event, reconcile now and again while the server drains the turn.
          reconcileStreamedThread(result.threadId);
          for (const delay of [2_000, 5_000, 15_000]) {
            window.setTimeout(
              () => reconcileStreamedThread(result.threadId!),
              delay,
            );
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("[create] stream failed", error);
        }
      } finally {
        if (streamAbortRef.current === abortController) {
          streamAbortRef.current = null;
        }
        setIsRunning(false);
      }
    },
    [projectId, queryClient, workspaceId],
  );

  const onCancel = useCallback(async () => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsRunning(false);
  }, []);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: convertCreateThreadMessage,
    onNew,
    onCancel,
  });

  return (
    <CreateGenerationsProvider
      workspaceId={workspaceId}
      projectId={projectId}
      byMessageId={generationsByMessageId}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <CreateComposerSessionRestore
          workspaceId={workspaceId}
          projectId={projectId}
        />
        {children}
      </AssistantRuntimeProvider>
    </CreateGenerationsProvider>
  );
}
