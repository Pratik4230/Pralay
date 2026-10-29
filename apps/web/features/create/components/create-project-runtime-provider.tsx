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
import {
  cancelProjectAssistantRun,
  retryProjectAssistantRun,
  submitProjectAssistantMessage,
} from "@/features/create/utils/fetch-project-assistant";
import { followProjectAssistantRun } from "@/features/create/utils/follow-project-assistant-run";

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
  const activeRunIdRef = useRef<string | null>(null);

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

    const latestRun = activeThreadId
      ? [...(messagesQuery.data?.messages ?? [])]
          .reverse()
          .find((message) => message.run)?.run
      : null;
    const latestFailedRun =
      latestRun?.status === "failed" || latestRun?.status === "cancelled"
        ? latestRun
        : null;
    if (
      latestFailedRun &&
      !persisted.some((message) => message.id === `run-${latestFailedRun.id}`)
    ) {
      return [
        ...persisted,
        {
          id: `run-${latestFailedRun.id}`,
          role: "assistant",
          content:
            latestFailedRun.status === "cancelled"
              ? "This response was cancelled. You can retry it."
              : `${latestFailedRun.errorMessage ?? "The assistant run failed."}\n\nYou can retry this response.`,
          createdAt: latestFailedRun.updatedAt,
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
  const reconcileThread = useCallback(
    (threadId: string) => {
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
    },
    [projectId, queryClient, workspaceId],
  );

  const followRun = useCallback(
    async (
      runId: string,
      threadId: string,
      abortController: AbortController,
    ) => {
      activeRunIdRef.current = runId;
      setIsRunning(true);
      try {
        await followProjectAssistantRun(workspaceId, projectId, runId, {
          signal: abortController.signal,
          onReset: () => setStreamedAssistant(null),
          onProgress: (label) => {
            setStreamedAssistant((current) =>
              current?.content
                ? current
                : {
                    id: `run-${runId}`,
                    threadId,
                    content: `${label}...`,
                    createdAt: new Date().toISOString(),
                  },
            );
          },
          onTextDelta: (_delta, fullText) => {
            setStreamedAssistant({
              id: `run-${runId}`,
              threadId,
              content: fullText,
              createdAt: new Date().toISOString(),
            });
          },
          onGeneration: () => reconcileThread(threadId),
          onCompleted: (run) => {
            if (!run.assistantMessageId) setStreamedAssistant(null);
            else {
              setStreamedAssistant((current) =>
                current ? { ...current, id: run.assistantMessageId! } : current,
              );
            }
            reconcileThread(threadId);
          },
          onFailed: (message) => {
            setStreamedAssistant({
              id: `run-${runId}`,
              threadId,
              content: `${message}\n\nYou can retry this response.`,
              createdAt: new Date().toISOString(),
            });
            reconcileThread(threadId);
          },
          onCancelled: () => {
            setStreamedAssistant(null);
            reconcileThread(threadId);
          },
        });
      } finally {
        if (streamAbortRef.current === abortController) {
          streamAbortRef.current = null;
        }
        if (activeRunIdRef.current === runId) activeRunIdRef.current = null;
        setIsRunning(false);
      }
    },
    [projectId, reconcileThread, workspaceId],
  );

  // Resume the newest unfinished run after navigation or a browser refresh.
  useEffect(() => {
    if (!activeThreadId || streamAbortRef.current || !messagesQuery.data)
      return;
    const resumable = [...messagesQuery.data.messages]
      .reverse()
      .find(
        (message) =>
          message.run?.status === "queued" ||
          message.run?.status === "processing",
      );
    if (!resumable?.run) return;

    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    void followRun(resumable.run.id, activeThreadId, abortController).catch(
      (error) => {
        if (!abortController.signal.aborted) {
          console.error("[create] failed to resume assistant run", error);
        }
      },
    );
    return () => abortController.abort();
  }, [activeThreadId, followRun, messagesQuery.data]);

  // Submit once, then follow persisted run events until a terminal state.
  // Editor turns use this path without replacing the user's unsent composer draft.
  // ---------------------------------------------------------------------------
  const submitTurn = useCallback(
    async (input: {
      prompt: string;
      referenceAssetIds: string[];
      editSourceAssetId?: string;
      enqueueGeneration?: boolean;
      generationType?: "generate" | "resize";
      resizeWidth?: number;
      resizeHeight?: number;
      clearComposer: boolean;
      onAccepted?: () => void;
    }) => {
      if (streamAbortRef.current) {
        throw new Error(
          "Wait for the current response before starting another edit.",
        );
      }
      const slice = useCreateProjectStore.getState().byProject[projectId];
      if (input.clearComposer) {
        useCreateProjectStore.getState().setDraft(projectId, "");
        useCreateProjectStore.getState().clearStagedAssets(projectId);
      }

      setIsRunning(true);
      setStreamedAssistant(null);
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      try {
        const result = await submitProjectAssistantMessage(
          workspaceId,
          projectId,
          {
            threadId: slice?.activeThreadId ?? undefined,
            prompt: input.prompt,
            referenceAssetIds: input.referenceAssetIds,
            editSourceAssetId: input.editSourceAssetId,
            enqueueGeneration: input.enqueueGeneration,
            generationType: input.generationType,
            resizeWidth: input.resizeWidth,
            resizeHeight: input.resizeHeight,
            chatModelId: slice?.session.chatModelId ?? "gpt-5.6-luna",
          },
        );
        useCreateProjectStore
          .getState()
          .setActiveThreadId(projectId, result.thread.id);
        reconcileThread(result.thread.id);
        input.onAccepted?.();
        await followRun(result.run.id, result.thread.id, abortController);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("[create] stream failed", error);
        }
        throw error;
      } finally {
        if (streamAbortRef.current === abortController) {
          streamAbortRef.current = null;
          setIsRunning(false);
        }
      }
    },
    [followRun, projectId, reconcileThread, workspaceId],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = extractUserText(message).trim();
      const staged =
        useCreateProjectStore.getState().byProject[projectId]?.stagedAssets ??
        [];
      const libraryAssets = resolveCreateSendReferenceAssets(staged, text);
      if (!text && libraryAssets.length === 0) return;
      try {
        await submitTurn({
          prompt: text || "Generate using the attached reference images.",
          referenceAssetIds: libraryAssets.map((asset) => asset.id),
          clearComposer: true,
        });
      } catch {
        // The shared submit path logs the error; the composer remains available.
      }
    },
    [projectId, submitTurn],
  );

  const submitImageEdit = useCallback(
    async (
      asset: { id: string; name: string },
      instruction: string,
      onAccepted: () => void,
    ) => {
      const trimmed = instruction.trim();
      if (!trimmed) throw new Error("Describe the change you want to make.");
      await submitTurn({
        prompt: `Edit @${asset.name}: ${trimmed}`,
        referenceAssetIds: [asset.id],
        editSourceAssetId: asset.id,
        clearComposer: false,
        onAccepted,
      });
    },
    [submitTurn],
  );

  const submitImageResize = useCallback(
    async (
      asset: { id: string; name: string },
      width: number,
      height: number,
      onAccepted: () => void,
    ) => {
      await submitTurn({
        prompt: `Resize @${asset.name} to ${width} × ${height} px using a centered crop.`,
        referenceAssetIds: [asset.id],
        clearComposer: false,
        enqueueGeneration: true,
        generationType: "resize",
        resizeWidth: width,
        resizeHeight: height,
        onAccepted,
      });
    },
    [submitTurn],
  );

  const onCancel = useCallback(async () => {
    const runId = activeRunIdRef.current;
    if (runId) {
      try {
        await cancelProjectAssistantRun(workspaceId, projectId, runId);
      } catch (error) {
        console.error("[create] failed to cancel assistant run", error);
      }
    }
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    activeRunIdRef.current = null;
    setIsRunning(false);
  }, [projectId, workspaceId]);

  const onReload = useCallback(
    async (parentId: string | null) => {
      if (!parentId || !activeThreadId) return;
      const sourceMessage = messagesQuery.data?.messages.find(
        (message) => message.id === parentId,
      );
      const run = sourceMessage?.run;
      if (!run || (run.status !== "failed" && run.status !== "cancelled")) {
        return;
      }

      const retried = await retryProjectAssistantRun(
        workspaceId,
        projectId,
        run.id,
      );
      setStreamedAssistant(null);
      const abortController = new AbortController();
      streamAbortRef.current = abortController;
      await followRun(retried.run.id, activeThreadId, abortController);
    },
    [
      activeThreadId,
      followRun,
      messagesQuery.data?.messages,
      projectId,
      workspaceId,
    ],
  );

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: convertCreateThreadMessage,
    onNew,
    onCancel,
    onReload,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CreateGenerationsProvider
        workspaceId={workspaceId}
        projectId={projectId}
        byMessageId={generationsByMessageId}
        submitImageEdit={submitImageEdit}
        submitImageResize={submitImageResize}
      >
        <CreateComposerSessionRestore
          workspaceId={workspaceId}
          projectId={projectId}
        />
        {children}
      </CreateGenerationsProvider>
    </AssistantRuntimeProvider>
  );
}
