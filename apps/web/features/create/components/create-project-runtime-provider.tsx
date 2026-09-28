"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";

import { createPralayWorkspaceAttachmentAdapter } from "@/features/create/adapters/pralay-workspace-attachment-adapter";
import { CreateComposerSessionRestore } from "@/features/create/components/create-composer-session-restore";
import {
  useProjectAssistantMessages,
  useSendProjectAssistantMessage,
} from "@/features/create/hooks/use-project-assistant";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { convertCreateThreadMessage } from "@/features/create/utils/convert-create-thread-message";
import { mapAssistantMessagesToCreateMessages } from "@/features/create/utils/map-assistant-messages";
import { mergeCreateSendAttachments } from "@/features/create/utils/merge-create-send-attachments";

type CreateProjectRuntimeProviderProps = {
  workspaceId: string;
  projectId: string;
  children: ReactNode;
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

  const sendMutation = useSendProjectAssistantMessage(workspaceId, projectId);

  const messages = useMemo(() => {
    if (!activeThreadId || !messagesQuery.data) return [];
    return mapAssistantMessagesToCreateMessages(
      queryClient,
      workspaceId,
      messagesQuery.data.messages,
    );
  }, [activeThreadId, messagesQuery.data, queryClient, workspaceId]);

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

      try {
        const result = await sendMutation.mutateAsync({
          threadId: slice?.activeThreadId ?? undefined,
          prompt,
          referenceAssetIds: libraryAssets.map((asset) => asset.id),
          chatModelId: slice?.session.chatModelId ?? "gpt-5.4-mini",
        });

        useCreateProjectStore
          .getState()
          .setActiveThreadId(projectId, result.thread.id);
        useCreateProjectStore.getState().clearStagedAssets(projectId);
        useCreateProjectStore.getState().setDraft(projectId, "");
      } catch {
        // Mutation error; add toast when Create surfaces send failures.
      }
    },
    [projectId, sendMutation],
  );

  const isRunning = sendMutation.isPending;

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: convertCreateThreadMessage,
    onNew,
    adapters: {
      attachments: attachmentAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <CreateComposerSessionRestore
        workspaceId={workspaceId}
        projectId={projectId}
      />
      {children}
    </AssistantRuntimeProvider>
  );
}
