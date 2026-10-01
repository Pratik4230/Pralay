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
import { submitProjectAssistantMessage } from "@/features/create/utils/fetch-project-assistant";

type CreateProjectRuntimeProviderProps = {
  workspaceId: string;
  projectId: string;
  children: ReactNode;
};

/** How often to poll for the assistant reply (ms). */
const REPLY_POLL_INTERVAL_MS = 2_000;

/** Max time to wait for an assistant reply before giving up (ms). */
const REPLY_TIMEOUT_MS = 90_000;

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

  /**
   * When set, the client polls GET /messages at REPLY_POLL_INTERVAL_MS until
   * an assistant message appears after this user message (or timeout fires).
   */
  const [pendingReplyForMessageId, setPendingReplyForMessageId] = useState<
    string | null
  >(null);

  // Track the submit timestamp for timeout
  const submitTimestampRef = useRef<number>(0);

  useEffect(() => {
    useCreateProjectStore.getState().ensureProject(projectId);
  }, [projectId]);

  const activeThreadId = useCreateProjectStore(
    (state) => state.byProject[projectId]?.activeThreadId ?? null,
  );

  // Poll while waiting for assistant reply; otherwise no auto-refetch.
  const messagesQuery = useProjectAssistantMessages(
    workspaceId,
    projectId,
    activeThreadId,
    {
      refetchInterval: pendingReplyForMessageId
        ? REPLY_POLL_INTERVAL_MS
        : false,
    },
  );

  // ---------------------------------------------------------------------------
  // Detect when the assistant reply arrives
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!pendingReplyForMessageId || !messagesQuery.data) return;

    const msgs = messagesQuery.data.messages;
    const pendingIdx = msgs.findIndex(
      (m) => m.id === pendingReplyForMessageId,
    );
    if (pendingIdx < 0) return; // user message not yet in page

    // Check if there is an assistant message after our user message
    const hasReply = msgs
      .slice(pendingIdx + 1)
      .some((m) => m.role === "assistant");

    if (hasReply) {
      setPendingReplyForMessageId(null);
      setIsRunning(false);
    }
  }, [messagesQuery.data, pendingReplyForMessageId]);

  // ---------------------------------------------------------------------------
  // Timeout: stop polling after REPLY_TIMEOUT_MS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!pendingReplyForMessageId) return;

    const elapsed = Date.now() - submitTimestampRef.current;
    const remaining = Math.max(0, REPLY_TIMEOUT_MS - elapsed);

    const timer = setTimeout(() => {
      console.warn(
        "[create] assistant reply timeout — stopping poll for message",
        pendingReplyForMessageId,
      );
      setPendingReplyForMessageId(null);
      setIsRunning(false);

      // Final invalidation to pick up whatever state the server has.
      if (activeThreadId) {
        void queryClient.invalidateQueries({
          queryKey: createKeys.assistantMessages(
            workspaceId,
            projectId,
            activeThreadId,
          ),
        });
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [
    pendingReplyForMessageId,
    activeThreadId,
    queryClient,
    workspaceId,
    projectId,
  ]);

  // ---------------------------------------------------------------------------
  // Map DB messages to assistant-ui format
  // ---------------------------------------------------------------------------
  const messages = useMemo((): CreateThreadMessage[] => {
    if (!activeThreadId || !messagesQuery.data) return [];
    return mapAssistantMessagesToCreateMessages(
      queryClient,
      workspaceId,
      messagesQuery.data.messages,
    );
  }, [activeThreadId, messagesQuery.data, queryClient, workspaceId]);

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
  // Send handler: submit + poll
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
      submitTimestampRef.current = Date.now();

      try {
        const result = await submitProjectAssistantMessage(
          workspaceId,
          projectId,
          {
            threadId: slice?.activeThreadId ?? undefined,
            prompt,
            referenceAssetIds: libraryAssets.map((a) => a.id),
            chatModelId: slice?.session.chatModelId ?? "gpt-5.4-mini",
          },
        );

        // Show user message immediately via query invalidation.
        useCreateProjectStore
          .getState()
          .setActiveThreadId(projectId, result.thread.id);

        void queryClient.invalidateQueries({
          queryKey: createKeys.assistantThreads(workspaceId, projectId),
        });
        void queryClient.invalidateQueries({
          queryKey: createKeys.assistantMessages(
            workspaceId,
            projectId,
            result.thread.id,
          ),
        });

        // Start polling for the assistant reply.
        setPendingReplyForMessageId(result.userMessage.id);
      } catch (error) {
        setIsRunning(false);
        console.error("[create] submit failed", error);
      }
    },
    [projectId, queryClient, workspaceId],
  );

  const onCancel = useCallback(async () => {
    setPendingReplyForMessageId(null);
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
