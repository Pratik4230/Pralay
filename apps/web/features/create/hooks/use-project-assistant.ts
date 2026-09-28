"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SendProjectAssistantMessageBodyInput } from "@repo/validators";

import { createKeys } from "@/features/create/utils/query-keys";
import {
  fetchProjectAssistantMessages,
  fetchProjectAssistantThreads,
  sendProjectAssistantMessage,
} from "@/features/create/utils/fetch-project-assistant";

export function useProjectAssistantThreads(
  workspaceId: string,
  projectId: string,
) {
  return useQuery({
    queryKey: createKeys.assistantThreads(workspaceId, projectId),
    queryFn: () => fetchProjectAssistantThreads(workspaceId, projectId),
    enabled: Boolean(workspaceId) && Boolean(projectId),
  });
}

export function useProjectAssistantMessages(
  workspaceId: string,
  projectId: string,
  threadId: string | null,
) {
  return useQuery({
    queryKey: createKeys.assistantMessages(
      workspaceId,
      projectId,
      threadId ?? "none",
    ),
    queryFn: () =>
      fetchProjectAssistantMessages(workspaceId, projectId, threadId!),
    enabled: Boolean(workspaceId) && Boolean(projectId) && Boolean(threadId),
  });
}

export function useSendProjectAssistantMessage(
  workspaceId: string,
  projectId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SendProjectAssistantMessageBodyInput) =>
      sendProjectAssistantMessage(workspaceId, projectId, body),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: createKeys.assistantThreads(workspaceId, projectId),
      });
      void queryClient.invalidateQueries({
        queryKey: createKeys.assistantMessages(
          workspaceId,
          projectId,
          data.thread.id,
        ),
      });
    },
  });
}
