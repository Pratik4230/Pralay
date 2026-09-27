"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from "@assistant-ui/react";
import { useShallow } from "zustand/react/shallow";

import { createPralayWorkspaceAttachmentAdapter } from "@/features/create/adapters/pralay-workspace-attachment-adapter";
import { CreateComposerSessionRestore } from "@/features/create/components/create-composer-session-restore";
import { useCreateProjectStore } from "@/features/create/store/create-project-store";
import { convertCreateThreadMessage } from "@/features/create/utils/convert-create-thread-message";
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
  useEffect(() => {
    useCreateProjectStore.getState().ensureProject(projectId);
  }, [projectId]);

  const messages = useCreateProjectStore(
    useShallow((state) => {
      const slice = state.byProject[projectId];
      const thread = slice?.threads.find(
        (item) => item.id === slice?.activeThreadId,
      );
      return thread?.messages ?? [];
    }),
  );

  const isRunning = useCreateProjectStore(
    (state) => state.byProject[projectId]?.isRunning ?? false,
  );

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

      useCreateProjectStore.getState().submitUserMessage(projectId, {
        text,
        libraryAssets,
      });
      useCreateProjectStore.getState().clearStagedAssets(projectId);
      useCreateProjectStore.getState().setDraft(projectId, "");
    },
    [projectId],
  );

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
