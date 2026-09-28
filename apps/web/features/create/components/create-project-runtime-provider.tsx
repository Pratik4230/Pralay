"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";

import type { AssistantMessage } from "@repo/validators";

import { createPralayWorkspaceAttachmentAdapter } from "@/features/create/adapters/pralay-workspace-attachment-adapter";
import { CreateComposerSessionRestore } from "@/features/create/components/create-composer-session-restore";
import { CreateGenerationsProvider } from "@/features/create/components/create-generations-context";
import { useProjectAssistantMessages } from "@/features/create/hooks/use-project-assistant";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { convertCreateThreadMessage } from "@/features/create/utils/convert-create-thread-message";
import type { CreateAttachedAsset, CreateThreadMessage } from "@/features/create/types/create-ui";
import { mapAssistantMessagesToCreateMessages } from "@/features/create/utils/map-assistant-messages";
import { mergeCreateSendAttachments } from "@/features/create/utils/merge-create-send-attachments";
import { createKeys } from "@/features/create/utils/query-keys";
import { streamProjectAssistantMessage } from "@/features/create/utils/stream-project-assistant";

type CreateProjectRuntimeProviderProps = {
  workspaceId: string;
  projectId: string;
  children: ReactNode;
};

type ActiveStreamState = {
  threadId: string;
  userMessage: AssistantMessage;
  assistantMessageId: string;
  assistantContent: string;
  libraryAssets: CreateAttachedAsset[];
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
  const abortRef = useRef<AbortController | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [streamState, setStreamState] = useState<ActiveStreamState | null>(
    null,
  );

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

  const messages = useMemo((): CreateThreadMessage[] => {
    const fallbackById = streamState
      ? new Map(streamState.libraryAssets.map((asset) => [asset.id, asset]))
      : undefined;

    if (
      streamState &&
      activeThreadId === streamState.threadId &&
      messagesQuery.data
    ) {
      const prior = messagesQuery.data.messages.filter(
        (message) => message.id !== streamState.userMessage.id,
      );
      const mappedPrior = mapAssistantMessagesToCreateMessages(
        queryClient,
        workspaceId,
        prior,
        fallbackById,
      );
      const user = mapAssistantMessagesToCreateMessages(
        queryClient,
        workspaceId,
        [streamState.userMessage],
        fallbackById,
      )[0];
      const streamingAssistant: CreateThreadMessage = {
        id: streamState.assistantMessageId,
        role: "assistant",
        content: streamState.assistantContent,
        createdAt: new Date().toISOString(),
      };
      return [
        ...mappedPrior,
        ...(user ? [user] : []),
        streamingAssistant,
      ];
    }

    if (!activeThreadId || !messagesQuery.data) return [];

    return mapAssistantMessagesToCreateMessages(
      queryClient,
      workspaceId,
      messagesQuery.data.messages,
      fallbackById,
    );
  }, [
    activeThreadId,
    messagesQuery.data,
    queryClient,
    streamState,
    workspaceId,
  ]);

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

  const attachmentAdapter = useMemo(
    () => createPralayWorkspaceAttachmentAdapter(workspaceId, projectId),
    [workspaceId, projectId],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractUserText(message);
      const staged =
        useCreateProjectStore.getState().byProject[projectId]?.stagedAssets ??
        [];
      const libraryAssets = mergeCreateSendAttachments(staged, message);

      const trimmed = text.trim();
      if (!trimmed && libraryAssets.length === 0) return;

      const prompt =
        trimmed || "Generate using the attached reference images.";

      const slice = useCreateProjectStore.getState().byProject[projectId];

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);

      try {
        await streamProjectAssistantMessage(
          workspaceId,
          projectId,
          {
            threadId: slice?.activeThreadId ?? undefined,
            prompt,
            referenceAssetIds: libraryAssets.map((asset) => asset.id),
            chatModelId: slice?.session.chatModelId ?? "gpt-5.4-mini",
          },
          {
            signal: controller.signal,
            onMeta: (event) => {
              useCreateProjectStore
                .getState()
                .setActiveThreadId(projectId, event.thread.id);
              setStreamState({
                threadId: event.thread.id,
                userMessage: event.userMessage,
                assistantMessageId: `stream-${event.userMessage.id}`,
                assistantContent: "",
                libraryAssets,
              });
            },
            onGeneration: (event) => {
              setStreamState((current) =>
                current
                  ? { ...current, userMessage: event.userMessage }
                  : current,
              );
            },
            onTextDelta: (_delta, fullText) => {
              setStreamState((current) =>
                current
                  ? { ...current, assistantContent: fullText }
                  : current,
              );
            },
            onDone: (event) => {
              setStreamState(null);
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantThreads(workspaceId, projectId),
              });
              void queryClient.invalidateQueries({
                queryKey: createKeys.assistantMessages(
                  workspaceId,
                  projectId,
                  event.thread.id,
                ),
              });
            },
            onError: () => {
              setStreamState(null);
            },
          },
        );

        useCreateProjectStore.getState().clearStagedAssets(projectId);
        useCreateProjectStore.getState().setDraft(projectId, "");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStreamState(null);
        }
      } finally {
        setIsRunning(false);
      }
    },
    [projectId, queryClient, workspaceId],
  );

  const onCancel = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setStreamState(null);
  }, []);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: convertCreateThreadMessage,
    onNew,
    onCancel,
    adapters: {
      attachments: attachmentAdapter,
    },
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
